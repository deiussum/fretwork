import type { ChannelOption, CountingMode, InputSettings, SettingsRepository } from '../../domain/settings'
import type { WorkletCommand, WorkletEvent } from '../onset/messages'
import { OnsetEmitter } from './onsetSource'

export type InputStatus = 'off' | 'requesting' | 'open' | 'denied' | 'unavailable' | 'lost'

export type InputDevice = { deviceId: string; label: string }

export type InputState = {
  mode: CountingMode
  status: InputStatus
  devices: InputDevice[]
  /** The device in use (the browser default if none was chosen). */
  activeDeviceId?: string
  channelCount: number
  channel: ChannelOption
  sensitivity: number
  recordSessions: boolean
  level: { rms: number; peak: number; channel: number }
  /** Audio-clock time of the most recent detected strum. */
  lastOnsetAt?: number
  /** The remembered device wasn't found, so the default input is in use. */
  savedDeviceMissing: boolean
  /** True while audio is waiting for a user gesture to start. */
  needsGesture: boolean
}

/** The audio-thread processor, as seen from the controller. */
export interface ProcessorHandle {
  post(command: WorkletCommand): void
  onEvent(listener: (event: WorkletEvent) => void): void
  disconnect(): void
}

export type AudioContextLike = {
  ensure(): AudioContext
  resume(): Promise<AudioContext>
  readonly running: boolean
}

type MediaDevicesLike = Pick<MediaDevices, 'getUserMedia' | 'enumerateDevices'> & {
  addEventListener(type: 'devicechange', listener: () => void): void
}

type Deps = {
  audio: AudioContextLike
  mediaDevices: MediaDevicesLike
  settings: SettingsRepository
  createProcessor: (ctx: AudioContext, stream: MediaStream) => Promise<ProcessorHandle>
}

const SILENT_LEVEL = { rms: 0, peak: 0, channel: 0 }

/**
 * Owns the audio input for Mic mode: permission, device choice, the strum
 * processor and remembered settings. Framework-free store (`getState` /
 * `subscribe`) and the session's `OnsetSource`.
 */
export class InputController {
  /** Detected strums, for `SessionEngine.start` in Mic mode. */
  readonly onsets = new OnsetEmitter()
  private state: InputState
  private readonly listeners = new Set<() => void>()
  private readonly chunkListeners = new Set<(chunk: { startTime: number; samples: Float32Array }) => void>()
  private readonly deps: Deps
  private stream: MediaStream | undefined
  private processor: ProcessorHandle | undefined
  /** Incremented to cancel an in-flight open when the mode changes. */
  private generation = 0

  constructor(deps: Deps) {
    this.deps = deps
    const saved = deps.settings.load()
    this.state = {
      mode: 'manual',
      status: 'off',
      devices: [],
      channelCount: 1,
      channel: saved.channel,
      sensitivity: saved.sensitivity,
      recordSessions: saved.recordSessions,
      level: SILENT_LEVEL,
      savedDeviceMissing: false,
      needsGesture: false,
    }
    deps.mediaDevices.addEventListener('devicechange', () => void this.onDeviceChange())
  }

  /** Reopen Mic mode if that's what the player used last time. */
  async restore(): Promise<void> {
    if (this.deps.settings.load().mode === 'mic') await this.setMode('mic')
  }

  getState = (): InputState => this.state

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  // --- Commands ---

  async setMode(mode: CountingMode): Promise<void> {
    if (mode === 'manual') {
      this.generation++
      this.close()
      this.setState({ mode: 'manual', status: 'off', level: SILENT_LEVEL, savedDeviceMissing: false })
      this.saveSettings({ mode: 'manual' })
      return
    }
    if (this.state.mode === 'mic' && this.state.status === 'open') return
    const saved = this.deps.settings.load()
    const opened = await this.open(saved.deviceId)
    if (opened) this.saveSettings({ mode: 'mic' })
  }

  async selectDevice(deviceId: string): Promise<void> {
    this.saveSettings({ deviceId })
    this.setState({ savedDeviceMissing: false })
    if (this.state.mode === 'mic') await this.open(deviceId)
  }

  setChannel(channel: ChannelOption): void {
    this.setState({ channel })
    this.saveSettings({ channel })
    this.processor?.post({ type: 'config', channel })
  }

  setSensitivity(sensitivity: number): void {
    this.setState({ sensitivity })
    this.saveSettings({ sensitivity })
    this.processor?.post({ type: 'config', sensitivity })
  }

  setRecordSessions(recordSessions: boolean): void {
    this.setState({ recordSessions })
    this.saveSettings({ recordSessions })
  }

  /** Start or stop sending raw input chunks (see `onChunk`). */
  setCapturing(capturing: boolean): void {
    this.processor?.post({ type: 'config', recording: capturing })
  }

  onChunk(listener: (chunk: { startTime: number; samples: Float32Array }) => void): () => void {
    this.chunkListeners.add(listener)
    return () => this.chunkListeners.delete(listener)
  }

  /** Call from a user gesture if `needsGesture` is set. */
  async unlock(): Promise<void> {
    await this.deps.audio.resume()
    this.setState({ needsGesture: false })
  }

  // --- Internals ---

  private async open(deviceId: string | undefined): Promise<boolean> {
    const generation = ++this.generation
    this.close()
    this.setState({ status: 'requesting' })

    let stream: MediaStream
    let savedDeviceMissing = false
    try {
      try {
        stream = await this.getStream(deviceId)
      } catch (error) {
        if (!deviceId || !isMissingDevice(error)) throw error
        // The remembered device is gone: fall back to the default input.
        stream = await this.getStream(undefined)
        savedDeviceMissing = true
      }
    } catch (error) {
      if (generation !== this.generation) return false
      const denied = errorName(error) === 'NotAllowedError' || errorName(error) === 'SecurityError'
      this.setState({ mode: 'manual', status: denied ? 'denied' : 'unavailable' })
      this.saveSettings({ mode: 'manual' })
      return false
    }
    if (generation !== this.generation) {
      stopStream(stream)
      return false
    }

    const track = stream.getAudioTracks()[0]
    const trackSettings = track?.getSettings() ?? {}
    track?.addEventListener('ended', () => {
      if (this.stream === stream) this.markLost()
    })

    const ctx = this.deps.audio.ensure()
    const processor = await this.deps.createProcessor(ctx, stream)
    if (generation !== this.generation) {
      processor.disconnect()
      stopStream(stream)
      return false
    }
    this.stream = stream
    this.processor = processor
    processor.onEvent(this.onProcessorEvent)
    processor.post({ type: 'config', sensitivity: this.state.sensitivity, channel: this.state.channel })

    const devices = await this.listDevices()
    this.setState({
      mode: 'mic',
      status: 'open',
      devices,
      activeDeviceId: trackSettings.deviceId,
      channelCount: trackSettings.channelCount ?? 1,
      savedDeviceMissing,
      needsGesture: !this.deps.audio.running,
    })
    this.onsets.setStatus('open')
    return true
  }

  private getStream(deviceId: string | undefined): Promise<MediaStream> {
    return this.deps.mediaDevices.getUserMedia({
      audio: {
        deviceId: deviceId ? { exact: deviceId } : undefined,
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        channelCount: { ideal: 2 },
      },
    })
  }

  private async listDevices(): Promise<InputDevice[]> {
    const all = await this.deps.mediaDevices.enumerateDevices()
    return all
      .filter((d) => d.kind === 'audioinput')
      .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Input ${i + 1}` }))
  }

  private onProcessorEvent = (event: WorkletEvent) => {
    switch (event.type) {
      case 'onset':
        this.setState({ lastOnsetAt: event.time })
        this.onsets.emit(event.time)
        break
      case 'level':
        this.setState({
          level: { rms: event.rms, peak: event.peak, channel: event.channel },
          channelCount: event.channelCount,
        })
        break
      case 'chunk':
        for (const listener of this.chunkListeners) listener(event)
        break
    }
  }

  private async onDeviceChange() {
    if (this.state.status !== 'open' && this.state.status !== 'lost') return
    const devices = await this.listDevices()
    this.setState({ devices })
    const active = this.state.activeDeviceId
    if (this.state.status === 'open' && active && !devices.some((d) => d.deviceId === active)) this.markLost()
  }

  private markLost() {
    this.setState({ status: 'lost', level: SILENT_LEVEL })
    this.onsets.setStatus('lost')
  }

  private close() {
    this.processor?.disconnect()
    this.processor = undefined
    if (this.stream) stopStream(this.stream)
    this.stream = undefined
  }

  private saveSettings(patch: Partial<InputSettings>) {
    this.deps.settings.save({ ...this.deps.settings.load(), ...patch })
  }

  private setState(patch: Partial<InputState>) {
    this.state = { ...this.state, ...patch }
    for (const listener of this.listeners) listener()
  }
}

function stopStream(stream: MediaStream) {
  for (const track of stream.getTracks()) track.stop()
}

// getUserMedia rejects with DOMException or OverconstrainedError, which aren't always `Error`s.
function errorName(error: unknown): string | undefined {
  return typeof error === 'object' && error !== null && 'name' in error ? String(error.name) : undefined
}

function isMissingDevice(error: unknown): boolean {
  const name = errorName(error)
  return name === 'OverconstrainedError' || name === 'NotFoundError'
}
