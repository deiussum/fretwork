/** What the session engine needs from a recorder. Times are on the audio clock. */
export interface SessionRecorder {
  /** Start a new recording of [from, to), discarding any previous one. */
  begin(from: number, to: number): void
  /** The session finished; keep the recording for export. */
  end(): void
  /** The session was aborted; drop the recording. */
  discard(): void
}
