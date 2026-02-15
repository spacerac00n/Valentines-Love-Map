/**
 * Ambient Music Generator — Creates soft, romantic piano-like tones
 * using the Web Audio API. No external MP3 files needed.
 *
 * Generates a dreamy, looping chord progression with reverb and soft attack.
 * Perfect for the "Time Travel" documentary-style experience.
 */

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let isPlaying = false;
let schedulerTimer: ReturnType<typeof setInterval> | null = null;

// Romantic chord progression in C major / A minor
// Each chord is an array of frequencies (Hz)
const CHORDS = [
  // C major (C4, E4, G4, C5)
  [261.63, 329.63, 392.0, 523.25],
  // Am (A3, C4, E4, A4)
  [220.0, 261.63, 329.63, 440.0],
  // F major (F3, A3, C4, F4)
  [174.61, 220.0, 261.63, 349.23],
  // G major (G3, B3, D4, G4)
  [196.0, 246.94, 293.66, 392.0],
  // Am (A3, C4, E4, A4)
  [220.0, 261.63, 329.63, 440.0],
  // Em (E3, G3, B3, E4)
  [164.81, 196.0, 246.94, 329.63],
  // F major (F3, A3, C4, F4)
  [174.61, 220.0, 261.63, 349.23],
  // G major (G3, B3, D4, G4)
  [196.0, 246.94, 293.66, 392.0],
];

const CHORD_DURATION = 3.0; // seconds per chord
const NOTE_ATTACK = 0.3;
const NOTE_RELEASE = 2.5;

/** Create a reverb impulse response */
function createReverb(ctx: AudioContext): ConvolverNode {
  const convolver = ctx.createConvolver();
  const rate = ctx.sampleRate;
  const length = rate * 3; // 3 second reverb
  const impulse = ctx.createBuffer(2, length, rate);

  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.5);
    }
  }

  convolver.buffer = impulse;
  return convolver;
}

/** Play a single soft tone */
function playTone(
  ctx: AudioContext,
  destination: AudioNode,
  frequency: number,
  startTime: number,
  duration: number,
  volume: number
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  // Use sine wave for soft, piano-like tone
  osc.type = "sine";
  osc.frequency.setValueAtTime(frequency, startTime);

  // Add slight detuning for warmth
  osc.detune.setValueAtTime(Math.random() * 6 - 3, startTime);

  // Soft attack and release envelope
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(volume, startTime + NOTE_ATTACK);
  gain.gain.setValueAtTime(volume, startTime + duration - NOTE_RELEASE);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  osc.connect(gain);
  gain.connect(destination);

  osc.start(startTime);
  osc.stop(startTime + duration + 0.1);
}

/** Play a chord (multiple tones) */
function playChord(
  ctx: AudioContext,
  destination: AudioNode,
  frequencies: number[],
  startTime: number,
  duration: number
) {
  frequencies.forEach((freq, i) => {
    // Stagger notes slightly for arpeggio feel
    const offset = i * 0.08;
    const vol = 0.06 - i * 0.008; // Higher notes slightly quieter
    playTone(ctx, destination, freq, startTime + offset, duration - offset, Math.max(vol, 0.02));
  });
}

/** Schedule the next batch of chords */
function scheduleChords(ctx: AudioContext, destination: AudioNode, startTime: number) {
  CHORDS.forEach((chord, i) => {
    playChord(ctx, destination, chord, startTime + i * CHORD_DURATION, CHORD_DURATION);
  });
}

/** Start the ambient music with a fade-in */
export function startMusic(): void {
  if (isPlaying) return;

  audioCtx = new AudioContext();
  masterGain = audioCtx.createGain();
  const reverb = createReverb(audioCtx);

  // Dry + wet mix
  const dryGain = audioCtx.createGain();
  const wetGain = audioCtx.createGain();
  dryGain.gain.value = 0.4;
  wetGain.gain.value = 0.6;

  dryGain.connect(masterGain);
  reverb.connect(wetGain);
  wetGain.connect(masterGain);
  masterGain.connect(audioCtx.destination);

  // Fade in over 2 seconds
  masterGain.gain.setValueAtTime(0, audioCtx.currentTime);
  masterGain.gain.linearRampToValueAtTime(1, audioCtx.currentTime + 2);

  // Create a merged destination for dry + reverb
  const mergeNode = audioCtx.createGain();
  mergeNode.connect(dryGain);
  mergeNode.connect(reverb);

  // Schedule initial chords
  let nextStart = audioCtx.currentTime + 0.5;
  scheduleChords(audioCtx, mergeNode, nextStart);

  // Loop: schedule next batch before current one ends
  const loopDuration = CHORDS.length * CHORD_DURATION;
  schedulerTimer = setInterval(() => {
    if (!audioCtx || !isPlaying) return;
    nextStart += loopDuration;
    scheduleChords(audioCtx, mergeNode, nextStart);
  }, (loopDuration - 2) * 1000); // Schedule 2 seconds before end

  isPlaying = true;
}

/** Stop the ambient music with a fade-out */
export function stopMusic(): void {
  if (!isPlaying || !audioCtx || !masterGain) return;

  // Fade out over 1.5 seconds
  const now = audioCtx.currentTime;
  masterGain.gain.setValueAtTime(masterGain.gain.value, now);
  masterGain.gain.linearRampToValueAtTime(0, now + 1.5);

  // Clean up after fade
  const ctx = audioCtx;
  setTimeout(() => {
    if (schedulerTimer) {
      clearInterval(schedulerTimer);
      schedulerTimer = null;
    }
    ctx.close().catch(() => {});
  }, 2000);

  audioCtx = null;
  masterGain = null;
  isPlaying = false;
}

/** Check if music is currently playing */
export function isMusicPlaying(): boolean {
  return isPlaying;
}
