import { useEffect } from 'react'
import type { OperatorConfig } from '../domain/operatorConfig'
import { PROJECT_URL } from '../project'

/** Update whenever the statement below changes. */
export const PRIVACY_UPDATED = '2026-10-03'


const updatedFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'long', timeZone: 'UTC' })

/**
 * What Fretwork does with your data. Keep this in step with the app: any
 * change that adds network access or stored data must update it. Hosting
 * details come from the operator of this instance (see operatorConfig.ts).
 */
export function PrivacyView({ onClose, operator = {} }: { onClose: () => void; operator?: OperatorConfig }) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <section className="screen privacy">
      <h1>Privacy</h1>
      <p className="lead">
        Fretwork runs entirely in your browser. There are no accounts, and nothing you do in the app is sent to a
        server or stored on one.
      </p>

      <h2>What leaves your browser</h2>
      <p>
        Only the requests your browser makes to load the app's own files from this site. The app doesn't contact any
        other site, and the published version blocks itself from doing so with a Content-Security-Policy.
      </p>
      <p data-testid="access-logs">
        Like most websites, the servers that host and serve this site may keep standard access logs: your IP address,
        the time, and which files were requested.{' '}
        {operator.logRetention
          ? `This site's operator states that they are kept for ${operator.logRetention}.`
          : "This site's operator hasn't stated how long they are kept."}
      </p>

      <h2>Microphone</h2>
      <p>
        Fretwork uses your microphone or audio interface only in Mic mode, and only after your browser asks for your
        permission. The audio is analysed in your browser as you play and never leaves it. For each session, only the
        times of the detected strums are saved, never the audio.
      </p>

      <h2>Session recordings</h2>
      <p>
        Recording is off unless you turn on <em>Record sessions</em>. A recording is kept in memory only, until you
        start another session or reload the page. Downloading it saves the files straight to your computer; nothing is
        uploaded.
      </p>

      <h2>Saved in your browser</h2>
      <ul>
        <li>Your practice results: chord pairs, scores, dates, and in Mic mode the strum times.</li>
        <li>The last chord pair you practised.</li>
        <li>Your settings for counting, audio input, the metronome and strumming.</li>
        <li>The strumming patterns you made.</li>
        <li>The ID of the input device you chose, a per-site ID assigned by your browser.</li>
      </ul>
      <p>
        This stays in this browser on this device. To delete it, clear this site's data in your browser's settings.
      </p>

      <h2>Questions</h2>
      {operator.operatorContact && (
        <p data-testid="operator-contact">
          For questions about this site, contact its operator: <Contact value={operator.operatorContact} />
        </p>
      )}
      <p>
        Fretwork is open source. Ask questions or report problems on{' '}
        <a href={PROJECT_URL} target="_blank" rel="noopener noreferrer">
          GitHub
        </a>
        .
      </p>

      <p className="hint">
        Last updated <time dateTime={PRIVACY_UPDATED}>{updatedFormat.format(new Date(PRIVACY_UPDATED))}</time>
      </p>

      <button className="primary" onClick={onClose}>
        Back
      </button>
      <p className="hint">
        <kbd>Esc</kbd> to go back
      </p>
    </section>
  )
}

/** An operator contact: a link for https: and mailto: values, plain text otherwise. */
function Contact({ value }: { value: string }) {
  if (value.startsWith('https://')) {
    return (
      <a href={value} target="_blank" rel="noopener noreferrer">
        {value}
      </a>
    )
  }
  if (value.startsWith('mailto:')) return <a href={value}>{value.slice('mailto:'.length)}</a>
  return <>{value}</>
}
