let ctx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext()
  return ctx
}

function tone(freq: number, duration: number, type: OscillatorType = 'sine', gainPeak = 0.15, delay = 0) {
  try {
    const audioCtx = getCtx()
    if (audioCtx.state === 'suspended') void audioCtx.resume().catch(() => {})
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.type = type
    osc.frequency.value = freq
    const start = audioCtx.currentTime + delay
    gain.gain.setValueAtTime(0, start)
    gain.gain.linearRampToValueAtTime(gainPeak, start + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
    osc.connect(gain)
    gain.connect(audioCtx.destination)
    osc.start(start)
    osc.stop(start + duration + 0.05)
    osc.onended = () => { osc.disconnect(); gain.disconnect() }
  } catch {
    // Audio is optional: unavailable hardware or permissions must never block a move.
  }
}

export const sfx = {
  keyPress: () => tone(440, 0.05, 'sine', 0.08),
  flip: () => tone(220, 0.08, 'triangle', 0.1),
  error: () => {
    tone(160, 0.12, 'sawtooth', 0.1)
    tone(120, 0.15, 'sawtooth', 0.1, 0.08)
  },
  win: () => {
    ;[523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => tone(freq, 0.25, 'sine', 0.12, i * 0.09))
  },
  lose: () => {
    ;[392, 349.23, 293.66].forEach((freq, i) => tone(freq, 0.35, 'sine', 0.1, i * 0.15))
  },
}
