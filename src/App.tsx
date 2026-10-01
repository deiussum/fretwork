import { useState } from 'react'
import type { HistoryRepository } from './domain/history'
import type { InputController } from './engine/input/audioInput'
import type { InputRecorder } from './engine/input/inputRecorder'
import type { MetronomeEngine } from './engine/metronome/metronome'
import type { SessionEngine } from './engine/session'
import { ChangesTool } from './ui/ChangesTool'
import { MetronomeTool } from './ui/MetronomeTool'
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

/** App shell: switches between practice tools. */
export default function App({ engine, history, input, recorder, metronome }: Props) {
  const [tool, setTool] = useState<Tool>('changes')
  const session = useSession(engine)
  // No switching away from a session in progress.
  const showSwitcher = tool === 'metronome' || session.kind === 'idle'

  return (
    <div className="app">
      {showSwitcher && (
        <nav className="tools" aria-label="Tools">
          {TOOLS.map(({ id, label }) => (
            <button key={id} aria-pressed={tool === id} onClick={() => setTool(id)}>
              {label}
            </button>
          ))}
        </nav>
      )}
      {/* Kept mounted so the chosen pair and view survive a visit to another tool. */}
      <ChangesTool engine={engine} history={history} input={input} recorder={recorder} active={tool === 'changes'} />
      {tool === 'metronome' && (
        <main>
          <MetronomeTool engine={metronome} />
        </main>
      )}
    </div>
  )
}
