import type { ChannelOption } from '../domain/settings'
import type { InputController, InputState } from '../engine/input/audioInput'
import { useInputState } from './useInput'

/** Manual / Mic choice plus, in Mic mode, the input setup. */
export function CountingPanel({ input }: { input: InputController }) {
  const state = useInputState(input)
  const mic = state.mode === 'mic'

  return (
    <section className="counting" aria-label="Counting">
      <div className="mode-toggle" role="radiogroup" aria-label="Counting mode">
        <button role="radio" aria-checked={!mic} onClick={() => void input.setMode('manual')}>
          Manual
        </button>
        <button
          role="radio"
          aria-checked={mic}
          disabled={state.status === 'requesting'}
          onClick={() => void input.setMode('mic')}
        >
          Mic
        </button>
      </div>
      <StatusMessage state={state} />
      {mic && state.status === 'open' && <InputSetup input={input} state={state} />}
    </section>
  )
}

function StatusMessage({ state }: { state: InputState }) {
  switch (state.status) {
    case 'requesting':
      return <p className="hint">Waiting for microphone permission…</p>
    case 'denied':
      return (
        <p className="warning" role="alert">
          Microphone access was blocked. Allow it in the browser's site settings to use Mic mode.
        </p>
      )
    case 'unavailable':
      return (
        <p className="warning" role="alert">
          No audio input was found. Connect a microphone or audio interface to use Mic mode.
        </p>
      )
    case 'lost':
      return (
        <p className="warning" role="alert">
          The audio input was disconnected. Choose another input, or reconnect it and switch to Mic again.
        </p>
      )
    default:
      return null
  }
}

function InputSetup({ input, state }: { input: InputController; state: InputState }) {
  return (
    <div className="input-setup">
      {state.savedDeviceMissing && (
        <p className="notice-inline" role="status">
          Your saved input wasn't found, so the default input is being used.
        </p>
      )}
      {state.needsGesture && (
        <button className="activate" onClick={() => void input.unlock()}>
          Click to activate the input
        </button>
      )}
      <label className="field">
        <span>Input</span>
        <select value={state.activeDeviceId ?? ''} onChange={(e) => void input.selectDevice(e.target.value)}>
          {state.devices.map((d) => (
            <option key={d.deviceId} value={d.deviceId}>
              {d.label}
            </option>
          ))}
        </select>
      </label>
      {state.channelCount > 1 && (
        <label className="field">
          <span>Channel</span>
          <select
            value={String(state.channel)}
            onChange={(e) => input.setChannel(parseChannel(e.target.value))}
          >
            <option value="auto">Auto (louder)</option>
            <option value="0">1</option>
            <option value="1">2</option>
          </select>
        </label>
      )}
      <div className="field">
        <span>Level</span>
        <LevelMeter rms={state.level.rms} peak={state.level.peak} />
        <StrumIndicator lastOnsetAt={state.lastOnsetAt} />
      </div>
      <label className="field">
        <span>Sensitivity</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={state.sensitivity}
          onChange={(e) => input.setSensitivity(Number(e.target.value))}
        />
      </label>
      <details className="advanced">
        <summary>Advanced</summary>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={state.recordSessions}
            onChange={(e) => input.setRecordSessions(e.target.checked)}
          />
          Record sessions (for tuning strum detection)
        </label>
      </details>
    </div>
  )
}

function parseChannel(value: string): ChannelOption {
  return value === '0' ? 0 : value === '1' ? 1 : 'auto'
}

/** Level in dBFS mapped to 0–100% over -60…0 dB. */
function toPercent(level: number): number {
  const db = 20 * Math.log10(level + 1e-9)
  return Math.max(0, Math.min(100, ((db + 60) / 60) * 100))
}

function LevelMeter({ rms, peak }: { rms: number; peak: number }) {
  return (
    <div className="level-meter" role="meter" aria-label="Input level" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(toPercent(rms))}>
      <div className="level-rms" style={{ width: `${toPercent(rms)}%` }} />
      <div className="level-peak" style={{ left: `${toPercent(peak)}%` }} />
    </div>
  )
}

/** Flashes once per detected strum: remounting on each onset restarts the animation. */
function StrumIndicator({ lastOnsetAt }: { lastOnsetAt?: number }) {
  return (
    <span className="strum-indicator" aria-label="Strum indicator">
      {lastOnsetAt !== undefined && <span key={lastOnsetAt} className="strum-flash" data-testid="strum-flash" />}
    </span>
  )
}
