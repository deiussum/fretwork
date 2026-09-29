export type DecodedWav = {
  sampleRate: number
  /** One array per channel, samples in [-1, 1]. */
  channels: Float32Array[]
}

/** Encode mono samples in [-1, 1] as a 16-bit PCM WAV file. */
export function encodeWav(samples: Float32Array, sampleRate: number): Uint8Array<ArrayBuffer> {
  const dataBytes = samples.length * 2
  const buffer = new ArrayBuffer(44 + dataBytes)
  const view = new DataView(buffer)
  writeAscii(view, 0, 'RIFF')
  view.setUint32(4, 36 + dataBytes, true)
  writeAscii(view, 8, 'WAVE')
  writeAscii(view, 12, 'fmt ')
  view.setUint32(16, 16, true) // fmt chunk size
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, 1, true) // mono
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true) // byte rate
  view.setUint16(32, 2, true) // block align
  view.setUint16(34, 16, true) // bits per sample
  writeAscii(view, 36, 'data')
  view.setUint32(40, dataBytes, true)
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(44 + i * 2, Math.round(s < 0 ? s * 0x8000 : s * 0x7fff), true)
  }
  return new Uint8Array(buffer)
}

/**
 * Decode a WAV file: 16/24/32-bit integer PCM or 32-bit float, any channel
 * count (as exported by Audacity and most DAWs).
 */
export function decodeWav(bytes: Uint8Array): DecodedWav {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (readAscii(view, 0, 4) !== 'RIFF' || readAscii(view, 8, 4) !== 'WAVE') throw new Error('Not a WAV file')

  let format: { audioFormat: number; channels: number; sampleRate: number; bits: number } | undefined
  let offset = 12
  while (offset + 8 <= view.byteLength) {
    const id = readAscii(view, offset, 4)
    const size = view.getUint32(offset + 4, true)
    const body = offset + 8
    if (id === 'fmt ') {
      let audioFormat = view.getUint16(body, true)
      // WAVE_FORMAT_EXTENSIBLE: the real format is the first 2 bytes of the sub-format GUID.
      if (audioFormat === 0xfffe && size >= 26) audioFormat = view.getUint16(body + 24, true)
      format = {
        audioFormat,
        channels: view.getUint16(body + 2, true),
        sampleRate: view.getUint32(body + 4, true),
        bits: view.getUint16(body + 14, true),
      }
    } else if (id === 'data') {
      if (!format) throw new Error('WAV data chunk before fmt chunk')
      const length = Math.min(size, view.byteLength - body)
      return { sampleRate: format.sampleRate, channels: readSamples(view, body, length, format) }
    }
    offset = body + size + (size % 2) // chunks are word-aligned
  }
  throw new Error('WAV file has no data chunk')
}

function readSamples(
  view: DataView,
  start: number,
  length: number,
  { audioFormat, channels, bits }: { audioFormat: number; channels: number; bits: number },
): Float32Array[] {
  const bytesPerSample = bits / 8
  const frames = Math.floor(length / (bytesPerSample * channels))
  const out = Array.from({ length: channels }, () => new Float32Array(frames))
  const read = sampleReader(view, audioFormat, bits)
  for (let f = 0; f < frames; f++) {
    for (let c = 0; c < channels; c++) {
      out[c][f] = read(start + (f * channels + c) * bytesPerSample)
    }
  }
  return out
}

function sampleReader(view: DataView, audioFormat: number, bits: number): (at: number) => number {
  if (audioFormat === 3 && bits === 32) return (at) => view.getFloat32(at, true)
  if (audioFormat === 1 && bits === 16) {
    // Mirror encodeWav: negative values scale by 0x8000, positive by 0x7fff.
    return (at) => {
      const value = view.getInt16(at, true)
      return value < 0 ? value / 0x8000 : value / 0x7fff
    }
  }
  if (audioFormat === 1 && bits === 24) {
    return (at) => {
      const value = view.getUint8(at) | (view.getUint8(at + 1) << 8) | (view.getInt8(at + 2) << 16)
      return value / 0x800000
    }
  }
  if (audioFormat === 1 && bits === 32) return (at) => view.getInt32(at, true) / 0x80000000
  throw new Error(`Unsupported WAV format ${audioFormat} with ${bits} bits`)
}

function writeAscii(view: DataView, at: number, text: string) {
  for (let i = 0; i < text.length; i++) view.setUint8(at + i, text.charCodeAt(i))
}

function readAscii(view: DataView, at: number, length: number): string {
  let text = ''
  for (let i = 0; i < length; i++) text += String.fromCharCode(view.getUint8(at + i))
  return text
}
