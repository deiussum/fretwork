import { useCallback, useEffect, useState, type MouseEvent } from 'react'
import type { HistoryRepository } from './domain/history'
import type { OperatorConfig } from './domain/operatorConfig'
import type { InputController } from './engine/input/audioInput'
import type { InputRecorder } from './engine/input/inputRecorder'
import type { MetronomeEngine } from './engine/metronome/metronome'
import type { SessionEngine } from './engine/session'
import { ChangesTool } from './ui/ChangesTool'
import { Logo, Wordmark } from './ui/Logo'
import { MetronomeTool } from './ui/MetronomeTool'
import { PrivacyView } from './ui/PrivacyView'
import { useSession } from './ui/useSession'

type Props = {
  engine: SessionEngine
  history: HistoryRepository
  input: InputController
  recorder?: InputRecorder
  metronome: MetronomeEngine
  /** The operator's hosting details, loading in the background; see operatorConfig.ts. */
  operatorConfig?: Promise<OperatorConfig>
}

type Tool = 'changes' | 'metronome'

const TOOLS: { id: Tool; label: string }[] = [
  { id: 'changes', label: '1 minute changes' },
  { id: 'metronome', label: 'Metronome' },
]

/** App shell: switches between practice tools and shows the footer and privacy page. */
export default function App({ engine, history, input, recorder, metronome, operatorConfig }: Props) {
  const [tool, setTool] = useState<Tool>('changes')
  const [showPrivacy, setShowPrivacy] = useState(false)
  const closePrivacy = useCallback(() => setShowPrivacy(false), [])
  const operator = useOperatorConfig(operatorConfig)
  const session = useSession(engine)
  /** Bumped by the home link; tells 1 minute changes to show its setup screen. */
  const [homeRequest, setHomeRequest] = useState(0)
  // No switching away from (or header and footer during) a session in progress.
  const showChrome = tool === 'metronome' || session.kind === 'idle'

  const goHome = (e: MouseEvent) => {
    e.preventDefault()
    setTool('changes')
    setShowPrivacy(false)
    setHomeRequest((n) => n + 1)
  }

  return (
    <div className="app">
      {showChrome && (
        <header className="site-header">
          <a href="/" className="home" aria-label="Fretwork, home" onClick={goHome}>
            <Logo />
            <Wordmark />
          </a>
          {!showPrivacy && (
            <nav className="tools" aria-label="Tools">
              {TOOLS.map(({ id, label }) => (
                <button key={id} aria-pressed={tool === id} onClick={() => setTool(id)}>
                  {label}
                </button>
              ))}
            </nav>
          )}
        </header>
      )}
      {/* Kept mounted so the chosen pair and view survive a visit to another tool or the privacy page. */}
      <ChangesTool
        engine={engine}
        history={history}
        input={input}
        recorder={recorder}
        active={tool === 'changes' && !showPrivacy}
        homeRequest={homeRequest}
      />
      {tool === 'metronome' && !showPrivacy && (
        <main>
          <MetronomeTool engine={metronome} />
        </main>
      )}
      {showPrivacy && (
        <main>
          <PrivacyView onClose={closePrivacy} operator={operator} />
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

/** The operator config once loaded; empty (nothing stated) until then. */
function useOperatorConfig(source: Promise<OperatorConfig> | undefined): OperatorConfig {
  const [config, setConfig] = useState<OperatorConfig>({})
  useEffect(() => {
    let current = true
    void source?.then((loaded) => {
      if (current) setConfig(loaded)
    })
    return () => {
      current = false
    }
  }, [source])
  return config
}
