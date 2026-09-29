import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { LocalStorageHistory } from './domain/localStorageHistory'
import { LocalStorageSettings } from './domain/settings'
import { SharedAudioContext } from './engine/audioContext'
import { InputController } from './engine/input/audioInput'
import { InputRecorder } from './engine/input/inputRecorder'
import { createStrumProcessor } from './engine/input/strumProcessorNode'
import { SessionEngine } from './engine/session'
import { WebAudioSounds } from './engine/sounds'
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App engine={engine} history={history} input={input} recorder={recorder} />
  </StrictMode>,
)
