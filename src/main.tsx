import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { LocalStorageHistory } from './domain/localStorageHistory'
import { SessionEngine } from './engine/session'
import { WebAudioSounds } from './engine/sounds'
import './index.css'

const audio = new WebAudioSounds()
const history = new LocalStorageHistory()
const engine = new SessionEngine({ clock: audio, sounds: audio, history })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App engine={engine} history={history} />
  </StrictMode>,
)
