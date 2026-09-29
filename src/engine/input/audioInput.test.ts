import { describe, expect, test, vi } from 'vitest'
import { FakeTrack, domError, fakeInput, fakeStream } from '../../test/fakeInput'

const setup = fakeInput

describe('InputController', () => {
  test('starts in Manual mode without touching the microphone', async () => {
    const { input, mediaDevices } = setup()
    await input.restore()
    expect(input.getState()).toMatchObject({ mode: 'manual', status: 'off' })
    expect(mediaDevices.getUserMedia).not.toHaveBeenCalled()
  })

  test('selecting Mic opens the input with voice processing off and lists devices', async () => {
    const { input, mediaDevices, settings, posted } = setup()
    await input.setMode('mic')
    const audio = mediaDevices.getUserMedia.mock.calls[0][0].audio as MediaTrackConstraints
    expect(audio).toMatchObject({
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
      channelCount: { ideal: 2 },
    })
    expect(input.getState()).toMatchObject({ mode: 'mic', status: 'open', activeDeviceId: 'default', channelCount: 2 })
    expect(input.getState().devices.map((d) => d.label)).toEqual(['Label default', 'Label volt-in-1', 'Label volt-in-2'])
    expect(settings.settings.mode).toBe('mic')
    expect(posted[0]).toEqual({ type: 'config', sensitivity: 0.5, channel: 'auto' })
  })

  test('denied permission stays in Manual mode', async () => {
    const { input, settings } = setup({ fail: () => domError('NotAllowedError') })
    await input.setMode('mic')
    expect(input.getState()).toMatchObject({ mode: 'manual', status: 'denied' })
    expect(settings.settings.mode).toBe('manual')
  })

  test('no input device is reported as unavailable', async () => {
    const { input } = setup({ fail: () => domError('NotFoundError') })
    await input.setMode('mic')
    expect(input.getState()).toMatchObject({ mode: 'manual', status: 'unavailable' })
  })

  test('a missing remembered device falls back to the default with a notice', async () => {
    const { input, mediaDevices } = setup({
      settings: { mode: 'mic', deviceId: 'unplugged' },
      fail: (id) => (id === 'unplugged' ? domError('OverconstrainedError') : undefined),
    })
    await input.restore()
    expect(mediaDevices.getUserMedia).toHaveBeenCalledTimes(2)
    expect(input.getState()).toMatchObject({ mode: 'mic', status: 'open', activeDeviceId: 'default', savedDeviceMissing: true })
  })

  test('restores the remembered device', async () => {
    const { input } = setup({ settings: { mode: 'mic', deviceId: 'volt-in-2', channel: 1, sensitivity: 0.7 } })
    await input.restore()
    expect(input.getState()).toMatchObject({ activeDeviceId: 'volt-in-2', channel: 1, sensitivity: 0.7 })
  })

  test('a track ending marks the input lost for the session', async () => {
    const { input, tracks } = setup()
    await input.setMode('mic')
    const onStatus = vi.fn()
    input.onsets.onStatus(onStatus)
    tracks[0].end()
    expect(input.getState().status).toBe('lost')
    expect(input.onsets.status).toBe('lost')
    expect(onStatus).toHaveBeenCalledWith('lost')
  })

  test('the active device disappearing marks the input lost', async () => {
    const { input, devices, deviceChange } = setup()
    await input.selectDevice('volt-in-2')
    await input.setMode('mic')
    devices.splice(devices.indexOf('volt-in-2'), 1)
    deviceChange.forEach((l) => l())
    await vi.waitFor(() => expect(input.getState().status).toBe('lost'))
  })

  test('switching back to Manual closes the input', async () => {
    const { input, tracks, processors, settings } = setup()
    await input.setMode('mic')
    await input.setMode('manual')
    expect(tracks[0].stopped).toBe(true)
    expect(processors[0].disconnected).toBe(true)
    expect(input.getState()).toMatchObject({ mode: 'manual', status: 'off' })
    expect(settings.settings.mode).toBe('manual')
  })

  test('selecting a device reopens on it and remembers it', async () => {
    const { input, tracks, settings } = setup()
    await input.setMode('mic')
    await input.selectDevice('volt-in-2')
    expect(tracks[0].stopped).toBe(true)
    expect(input.getState().activeDeviceId).toBe('volt-in-2')
    expect(settings.settings.deviceId).toBe('volt-in-2')
  })

  test('forwards onsets and level, and posts channel and sensitivity changes', async () => {
    const { input, processors, posted, settings } = setup()
    await input.setMode('mic')
    const onset = vi.fn()
    input.onsets.subscribe(onset)
    processors[0].emit({ type: 'onset', time: 12.3 })
    processors[0].emit({ type: 'level', rms: 0.1, peak: 0.4, channel: 1, channelCount: 2 })
    expect(onset).toHaveBeenCalledWith(12.3)
    expect(input.getState()).toMatchObject({ lastOnsetAt: 12.3, level: { rms: 0.1, peak: 0.4, channel: 1 } })

    input.setChannel(0)
    input.setSensitivity(0.8)
    expect(posted.slice(-2)).toEqual([
      { type: 'config', channel: 0 },
      { type: 'config', sensitivity: 0.8 },
    ])
    expect(settings.settings).toMatchObject({ channel: 0, sensitivity: 0.8 })
  })

  test('switching to Manual while permission is pending cancels the open', async () => {
    let resolve: (s: MediaStream) => void = () => {}
    const { input, mediaDevices } = setup()
    const track = new FakeTrack('default')
    mediaDevices.getUserMedia.mockImplementationOnce(() => new Promise((r) => (resolve = r)))
    const opening = input.setMode('mic')
    await input.setMode('manual')
    resolve(fakeStream(track))
    await opening
    expect(track.stopped).toBe(true)
    expect(input.getState()).toMatchObject({ mode: 'manual', status: 'off' })
  })
})
