import type { ChordPair } from '../domain/chords'
import type { InputRecorder } from '../engine/input/inputRecorder'
import { recordingFileBase } from '../engine/recording/sessionRecording'

/** Download buttons for the last recorded session (WAV + Audacity labels). */
export function RecordingDownloads({ recorder, pair }: { recorder: InputRecorder; pair: ChordPair }) {
  const download = (kind: 'wav' | 'labels') => {
    const recording = recorder.current
    if (!recording) return
    const { wav, labels } = recording.build()
    const base = recordingFileBase(pair, recorder.startedAt ?? new Date())
    const blob =
      kind === 'wav' ? new Blob([wav], { type: 'audio/wav' }) : new Blob([labels], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = kind === 'wav' ? `${base}.wav` : `${base}.labels.txt`
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <div className="downloads">
      <span className="hint">Recording:</span>
      <button type="button" onClick={() => download('wav')}>
        Download WAV
      </button>
      <button type="button" onClick={() => download('labels')}>
        Download labels
      </button>
    </div>
  )
}
