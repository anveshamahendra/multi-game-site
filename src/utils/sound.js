// ============================================================
// sound.js — tiny shared SFX engine, built on the WebAudio API.
//
// Why generate tones instead of loading .mp3/.wav files?
//   - Zero external assets to download, host, or lose track of.
//   - Every game gets the SAME sound "language" for free (a hit
//     always sounds like a hit, across all 5 games).
//   - It's ~40 lines and easy for a beginner to read and explain
//     in a live eval, versus an <audio> tag + asset pipeline.
//
// Each game just calls playSfx('hit') / playSfx('gameOver') etc.
// ============================================================

let ctx = null
function getCtx() {
  // Browsers block audio until a user gesture; we lazily create
  // the AudioContext on the first sound request instead of on load.
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
  return ctx
}

// One tiny synth "patch" per effect: [frequency(Hz), duration(s), waveform]
const PRESETS = {
  move:      { freq: 220,  dur: 0.05, type: 'square'   },
  hit:       { freq: 440,  dur: 0.08, type: 'square'   },
  wallBounce:{ freq: 330,  dur: 0.06, type: 'triangle' },
  score:     { freq: 660,  dur: 0.12, type: 'triangle' },
  powerUp:   { freq: 880,  dur: 0.15, type: 'sine'     },
  clear:     { freq: 990,  dur: 0.18, type: 'sine'     },
  gameOver:  { freq: 140,  dur: 0.4,  type: 'sawtooth' },
  start:     { freq: 523,  dur: 0.12, type: 'triangle' },
}

let muted = false
export function setMuted(value) { muted = value }
export function isMuted() { return muted }

export function playSfx(name) {
  if (muted) return
  const preset = PRESETS[name] || PRESETS.hit
  const audio = getCtx()
  const osc = audio.createOscillator()
  const gain = audio.createGain()

  osc.type = preset.type
  osc.frequency.value = preset.freq
  gain.gain.setValueAtTime(0.15, audio.currentTime)
  // exponential fade-out so notes don't click when they stop
  gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + preset.dur)

  osc.connect(gain)
  gain.connect(audio.destination)
  osc.start()
  osc.stop(audio.currentTime + preset.dur)
}
