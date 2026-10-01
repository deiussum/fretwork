import { useCallback, useState } from 'react'
import type { HistoryRepository } from './domain/history'
import type { InputController } from './engine/input/audioInput'
import type { InputRecorder } from './engine/input/inputRecorder'
import type { MetronomeEngine } from './engine/metronome/metronome'
import type { SessionEngine } from './engine/session'
import { ChangesTool } from './ui/ChangesTool'
import { MetronomeTool } from './ui/MetronomeTool'
import { PrivacyView } from './ui/PrivacyView'
import { useSession } from './ui/useSession'

type Props = {
  engine: SessionEngine
  history: HistoryRepository
  input: InputController
  recorder?: InputRecorder
  metronome: MetronomeEngine
}

type Tool = 'changes' | 'metronome'

const TOOLS: { id: Tool; label: string }[] = [
  { id: 'changes', label: '1 minute changes' },
  { id: 'metronome', label: 'Metronome' },
]

/** App shell: switches between practice tools and shows the footer and privacy page. */
export default function App({ engine, history, input, recorder, metronome }: Props) {
  const [tool, setTool] = useState<Tool>('changes')
  const [showPrivacy, setShowPrivacy] = useState(false)
  const closePrivacy = useCallback(() => setShowPrivacy(false), [])
  const session = useSession(engine)
  // No switching away from (or footer during) a session in progress.
  const showChrome = tool === 'metronome' || session.kind === 'idle'

  return (
    <div className="app">
      {showChrome && !showPrivacy && (
        <nav className="tools" aria-label="Tools">
          {TOOLS.map(({ id, label }) => (
            <button key={id} aria-pressed={tool === id} onClick={() => setTool(id)}>
              {label}
            </button>
          ))}
        </nav>
      )}
      {/* Kept mounted so the chosen pair and view survive a visit to another tool or the privacy page. */}
      <ChangesTool
        engine={engine}
        history={history}
        input={input}
        recorder={recorder}
        active={tool === 'changes' && !showPrivacy}
      />
      {tool === 'metronome' && !showPrivacy && (
        <main>
          <MetronomeTool engine={metronome} />
        </main>
      )}
      {showPrivacy && (
        <main>
          <PrivacyView onClose={closePrivacy} />
        </main>
      )}
      {showChrome && (
        <footer className="footer">
          <button className="link" onClick={() => setShowPrivacy(true)} disabled={showPrivacy}>
            Privacy
          </button>
          <span className="version">{__APP_VERSION__}</span>
        </footer>
      )}
    </div>
  )
}
