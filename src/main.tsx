import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { LocalStorageHistory } from './domain/localStorageHistory'
import { LocalStorageMetronomeSettings } from './domain/metronomeSettings'
import { loadOperatorConfig } from './domain/operatorConfig'
import { LocalStorageUiPrefs } from './domain/uiPrefs'
import { LocalStorageSettings } from './domain/settings'
import { LocalStoragePatterns, LocalStorageStrummingSettings, findPattern } from './domain/strummingSettings'
import { SharedAudioContext } from './engine/audioContext'
import { InputController } from './engine/input/audioInput'
import { InputRecorder } from './engine/input/inputRecorder'
import { createStrumProcessor } from './engine/input/strumProcessorNode'
import { MetronomeEngine, type VisibilitySource } from './engine/metronome/metronome'
import { SessionEngine } from './engine/session'
import { WebAudioSounds } from './engine/sounds'
import { StrummingEngine } from './engine/strumming/strumming'
import TickerWorker from './engine/tickerWorker.ts?worker'
import { WorkerTicker } from './engine/workerTicker'
import './index.css'

const audio = new SharedAudioContext()
const sounds = new WebAudioSounds(audio)
const history = new LocalStorageHistory()
const engine = new SessionEngine({ clock: audio, sounds, history })

// mediaDevices is missing on insecure origins; Mic mode then reports "no input".
const mediaDevices = navigator.mediaDevices ?? {
  getUserMedia: () => Promise.reject(Object.assign(new Error('No media devices'), { name: 'NotFoundError' })),
  enumerateDevices: async () => [],
  addEventListener: () => {},
}
const input = new InputController({
  audio,
  mediaDevices,
  settings: new LocalStorageSettings(),
  createProcessor: createStrumProcessor,
})
const recorder = new InputRecorder(input, () => audio.ensure().sampleRate)
void input.restore()

const visibility: VisibilitySource = {
  hidden: () => document.visibilityState === 'hidden',
  onChange: (listener) => {
    document.addEventListener('visibilitychange', listener)
    return () => document.removeEventListener('visibilitychange', listener)
  },
}
const metronomeSettings = new LocalStorageMetronomeSettings()
// Its own sound scheduler, so stopping the metronome never cancels session sounds.
const metronome = new MetronomeEngine({
  clock: audio,
  sounds: new WebAudioSounds(audio),
  ticker: new WorkerTicker(() => new TickerWorker()),
  visibility,
  settings: metronomeSettings.load(),
})
let savedSettings = metronome.getState().settings
metronome.subscribe(() => {
  const { settings } = metronome.getState()
  if (settings === savedSettings) return
  savedSettings = settings
  metronomeSettings.save(settings)
})

const patterns = new LocalStoragePatterns()
const strummingSettings = new LocalStorageStrummingSettings()
const savedStrumming = strummingSettings.load()
// Its own clicks and guide schedulers, so neither cancels the other or the metronome's.
const strumming = new StrummingEngine({
  clock: audio,
  sounds: new WebAudioSounds(audio),
  guide: new WebAudioSounds(audio),
  ticker: new WorkerTicker(() => new TickerWorker()),
  visibility,
  pattern: findPattern(savedStrumming.patternId, patterns.load()),
  tempo: { bpm: savedStrumming.bpm, trainerOn: savedStrumming.trainerOn, trainer: savedStrumming.trainer },
  sound: savedStrumming.sound,
})
let lastSavedStrumming = ''
const saveStrumming = () => {
  const { bpm, trainerOn, trainer } = strumming.metronome.getState().settings
  const { pattern, sound } = strumming.getState()
  const next = { bpm, trainerOn, trainer, sound, patternId: pattern.id }
  const serialised = JSON.stringify(next)
  if (serialised === lastSavedStrumming) return
  lastSavedStrumming = serialised
  strummingSettings.save(next)
}
strumming.subscribe(saveStrumming)
strumming.metronome.subscribe(saveStrumming)

// Fetched once, in the background, so the first render isn't delayed.
const operatorConfig = loadOperatorConfig()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App engine={engine} history={history} input={input} recorder={recorder} metronome={metronome} strumming={{ engine: strumming, patterns }} operatorConfig={operatorConfig} uiPrefs={new LocalStorageUiPrefs()} />
  </StrictMode>,
)
