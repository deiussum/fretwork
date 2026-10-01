import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { LocalStorageHistory } from './domain/localStorageHistory'
import { LocalStorageMetronomeSettings } from './domain/metronomeSettings'
import { LocalStorageSettings } from './domain/settings'
import { SharedAudioContext } from './engine/audioContext'
import { InputController } from './engine/input/audioInput'
import { InputRecorder } from './engine/input/inputRecorder'
import { createStrumProcessor } from './engine/input/strumProcessorNode'
import { MetronomeEngine, type VisibilitySource } from './engine/metronome/metronome'
import { SessionEngine } from './engine/session'
import { WebAudioSounds } from './engine/sounds'
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App engine={engine} history={history} input={input} recorder={recorder} metronome={metronome} />
  </StrictMode>,
)
