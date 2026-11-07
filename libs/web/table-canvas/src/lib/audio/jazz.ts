import { midiToHz, noise, tone } from './synth';

/**
 * A soft, endless lounge-jazz loop: electric-piano chords, a walking bass and brushes over a
 * ii–V–I–vi in F. Notes are scheduled a little ahead of time so timer hiccups do not stutter.
 */

const BPM = 84;
const BEAT = 60 / BPM;
/** Swung eighth: the "and" lands two thirds into the beat. */
const SWING = BEAT * 0.66;
const LOOKAHEAD_S = 1.2;
const TICK_MS = 250;
const VOLUME = 0.32;

interface Bar {
	/** Walking bass, one note per beat; the last one leads into the next chord. */
	bass: number[];
	/** Rootless piano voicing. */
	chord: number[];
}

const BARS: Bar[] = [
	{ bass: [43, 46, 50, 47], chord: [65, 69, 70, 74] }, // Gm9
	{ bass: [48, 52, 55, 42], chord: [64, 69, 70, 74] }, // C13
	{ bass: [41, 45, 48, 37], chord: [64, 67, 69, 72] }, // Fmaj9
	{ bass: [38, 41, 45, 44], chord: [65, 69, 72, 76] }, // Dm9
];

export class JazzLoop {
	private readonly bus: GainNode;
	private timer: ReturnType<typeof setInterval> | undefined;
	private nextBeatAt = 0;
	private beat = 0;

	constructor(
		private readonly ctx: AudioContext,
		out: AudioNode,
	) {
		const warmth = ctx.createBiquadFilter();
		warmth.type = 'lowpass';
		warmth.frequency.value = 2800;
		this.bus = ctx.createGain();
		this.bus.gain.value = 0;
		this.bus.connect(warmth).connect(out);
	}

	get playing(): boolean {
		return this.timer !== undefined;
	}

	start(): void {
		if (this.timer) {
			return;
		}
		const now = this.ctx.currentTime;
		this.bus.gain.cancelScheduledValues(now);
		this.bus.gain.setTargetAtTime(VOLUME, now, 0.6);
		this.nextBeatAt = now + 0.1;
		this.beat = 0;
		this.timer = setInterval(() => this.schedule(), TICK_MS);
		this.schedule();
	}

	/** Fades out; notes already scheduled die away under the fade. */
	stop(): void {
		clearInterval(this.timer);
		this.timer = undefined;
		const now = this.ctx.currentTime;
		this.bus.gain.cancelScheduledValues(now);
		this.bus.gain.setTargetAtTime(0, now, 0.3);
	}

	private schedule(): void {
		while (this.nextBeatAt < this.ctx.currentTime + LOOKAHEAD_S) {
			this.playBeat(this.beat, this.nextBeatAt);
			this.nextBeatAt += BEAT;
			this.beat++;
		}
	}

	private playBeat(beat: number, at: number): void {
		const bar = BARS[Math.floor(beat / 4) % BARS.length] as Bar;
		const step = beat % 4;
		this.bass(bar.bass[step] ?? 41, at);
		if (step === 0) {
			this.comp(bar.chord, at, 2.4);
		} else if (step === 1 && Math.random() < 0.6) {
			this.comp(bar.chord, at + SWING, 0.9);
		}
		this.brush(at, step === 1 || step === 3 ? 0.06 : 0.025);
		if (Math.random() < 0.5) {
			this.brush(at + SWING, 0.02);
		}
	}

	/** Electric piano: a sine with a quieter octave on top, slightly spread in time like a real hand. */
	private comp(chord: number[], at: number, length: number): void {
		chord.forEach((note, index) => {
			const start = at + index * 0.012;
			const freq = midiToHz(note);
			tone(this.ctx, this.bus, { freq, start, duration: length, gain: 0.045 });
			tone(this.ctx, this.bus, { freq: freq * 2, start, duration: length * 0.4, gain: 0.012 });
		});
	}

	private bass(note: number, at: number): void {
		tone(this.ctx, this.bus, {
			freq: midiToHz(note),
			start: at,
			duration: BEAT * 0.95,
			gain: 0.22,
			type: 'triangle',
		});
	}

	private brush(at: number, gain: number): void {
		noise(this.ctx, this.bus, { start: at, duration: 0.14, gain, freq: 7000, q: 0.6 });
	}
}
