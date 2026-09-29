import { formatPair } from '../domain/chords'
import { summarizeByPair, type Result } from '../domain/history'

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })
const dateTimeFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })

export function HistoryView({ results }: { results: Result[] }) {
  const summaries = summarizeByPair(results)

  if (summaries.length === 0) {
    return (
      <section className="screen history">
        <h1>History</h1>
        <p>No results yet. Finish a session to see it here.</p>
      </section>
    )
  }

  return (
    <section className="screen history">
      <h1>History</h1>
      <div className="history-header" aria-hidden>
        <span>Pair</span>
        <span>Best</span>
        <span>Latest</span>
        <span>Attempts</span>
        <span>Last practised</span>
      </div>
      {summaries.map((s) => (
        <details key={s.pairKey} className="history-pair">
          <summary>
            <span>{formatPair(s.chords)}</span>
            <span>{s.best}</span>
            <span>{s.latest}</span>
            <span>{s.attempts}</span>
            <span>{dateFormat.format(new Date(s.lastAt))}</span>
          </summary>
          <ol className="history-results">
            {s.results.map((r) => (
              <li key={r.id}>
                <span>{dateTimeFormat.format(new Date(r.at))}</span>
                <span>{r.score}</span>
              </li>
            ))}
          </ol>
        </details>
      ))}
    </section>
  )
}
