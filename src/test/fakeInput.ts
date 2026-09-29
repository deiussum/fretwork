import { vi } from 'vitest'
import { DEFAULT_INPUT_SETTINGS, type InputSettings, type SettingsRepository } from '../domain/settings'
import { InputController, type AudioContextLike, type ProcessorHandle } from '../engine/input/audioInput'
import type { WorkletCommand, WorkletEvent } from '../engine/onset/messages'

export class MemorySettings implements SettingsRepository {
  available = true
  settings: InputSettings
  constructor(initial: Partial<InputSettings> = {}) {
    this.settings = { ...DEFAULT_INPUT_SETTINGS, ...initial }
  }
  load() {
    return this.settings
  }
  save(settings: InputSettings) {
    this.settings = settings
  }
}

export class FakeTrack extends EventTarget {
  stopped = false
  readonly deviceId: string
  readonly channelCount: number
  constructor(deviceId: string, channelCount = 2) {
    super()
    this.deviceId = deviceId
    this.channelCount = channelCount
  }
  getSettings() {
    return { deviceId: this.deviceId, channelCount: this.channelCount }
  }
  stop() {
    this.stopped = true
  }
  end() {
    this.dispatchEvent(new Event('ended'))
  }
}

export function fakeStream(track: FakeTrack) {
  return { getAudioTracks: () => [track], getTracks: () => [track] } as unknown as MediaStream
}

export function domError(name: string) {
  return Object.assign(new Error(name), { name })
}

export type FakeInputOptions = {
  settings?: Partial<InputSettings>
  devices?: string[]
  channelCount?: number
  fail?: (deviceId?: string) => Error | undefined
}

/** An InputController wired to fake media devices and a fake strum processor. */
export function fakeInput(options: FakeInputOptions = {}) {
  const devices = options.devices ?? ['default', 'volt-in-1', 'volt-in-2']
  const tracks: FakeTrack[] = []
  const deviceChange: (() => void)[] = []
  const mediaDevices = {
    getUserMedia: vi.fn(async (constraints: MediaStreamConstraints) => {
      const audio = constraints.audio as MediaTrackConstraints
      const id = (audio.deviceId as { exact: string } | undefined)?.exact
      const error = options.fail?.(id)
      if (error) throw error
      const track = new FakeTrack(id ?? 'default', options.channelCount ?? 2)
      tracks.push(track)
      return fakeStream(track)
    }),
    enumerateDevices: vi.fn(async () =>
      devices.map((deviceId) => ({ deviceId, kind: 'audioinput', label: `Label ${deviceId}` }) as MediaDeviceInfo),
    ),
    addEventListener: (_: 'devicechange', listener: () => void) => deviceChange.push(listener),
  }
  const posted: WorkletCommand[] = []
  const processors: { handle: ProcessorHandle; emit: (e: WorkletEvent) => void; disconnected: boolean }[] = []
  const createProcessor = vi.fn(async () => {
    let listener: (e: WorkletEvent) => void = () => {}
    const entry = {
      disconnected: false,
      emit: (e: WorkletEvent) => listener(e),
      handle: {
        post: (c: WorkletCommand) => posted.push(c),
        onEvent: (l: (e: WorkletEvent) => void) => {
          listener = l
        },
        disconnect: () => {
          entry.disconnected = true
        },
      },
    }
    processors.push(entry)
    return entry.handle
  })
  const audio: AudioContextLike = {
    ensure: () => ({ sampleRate: 48000 }) as AudioContext,
    resume: async () => ({ sampleRate: 48000 }) as AudioContext,
    running: true,
  }
  const settings = new MemorySettings(options.settings)
  const input = new InputController({ audio, mediaDevices, settings, createProcessor })
  /** Emit an event from the most recently opened processor. */
  const emit = (event: WorkletEvent) => processors.at(-1)?.emit(event)
  return { input, mediaDevices, settings, tracks, processors, posted, devices, deviceChange, emit }
}
