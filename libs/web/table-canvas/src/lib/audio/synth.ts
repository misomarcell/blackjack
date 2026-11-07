/** Tiny Web Audio building blocks: a shaped tone and a filtered noise burst. Everything is synthesized. */

export interface ToneOptions {
	freq: number;
	start: number;
	duration: number;
	gain: number;
	type?: OscillatorType;
	/** Slides the pitch to this frequency over the note. */
	glideTo?: number;
}

export interface NoiseOptions {
	start: number;
	duration: number;
	gain: number;
	/** Band-pass center frequency. */
	freq: number;
	q?: number;
}

const noiseBuffers = new WeakMap<BaseAudioContext, AudioBuffer>();

/** One second of white noise per context, reused by every noise burst. */
function noiseBuffer(ctx: BaseAudioContext): AudioBuffer {
	let buffer = noiseBuffers.get(ctx);
	if (!buffer) {
		buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
		const data = buffer.getChannelData(0);
		for (let i = 0; i < data.length; i++) {
			data[i] = Math.random() * 2 - 1;
		}
		noiseBuffers.set(ctx, buffer);
	}
	return buffer;
}

/** A quick attack and an exponential fade, the shape of a plucked or struck sound. */
function envelope(ctx: BaseAudioContext, start: number, duration: number, peak: number): GainNode {
	const gain = ctx.createGain();
	gain.gain.setValueAtTime(0.0001, start);
	gain.gain.exponentialRampToValueAtTime(peak, start + 0.008);
	gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
	return gain;
}

export function tone(ctx: BaseAudioContext, out: AudioNode, options: ToneOptions): void {
	const { freq, start, duration, gain, type = 'sine', glideTo } = options;
	const osc = ctx.createOscillator();
	osc.type = type;
	osc.frequency.setValueAtTime(freq, start);
	if (glideTo) {
		osc.frequency.exponentialRampToValueAtTime(glideTo, start + duration);
	}
	osc.connect(envelope(ctx, start, duration, gain)).connect(out);
	osc.start(start);
	osc.stop(start + duration + 0.05);
}

export function noise(ctx: BaseAudioContext, out: AudioNode, options: NoiseOptions): void {
	const { start, duration, gain, freq, q = 1 } = options;
	const source = ctx.createBufferSource();
	source.buffer = noiseBuffer(ctx);
	const filter = ctx.createBiquadFilter();
	filter.type = 'bandpass';
	filter.frequency.value = freq;
	filter.Q.value = q;
	source
		.connect(filter)
		.connect(envelope(ctx, start, duration, gain))
		.connect(out);
	source.start(start, Math.random() * 0.8, duration + 0.05);
}

/** Equal-tempered frequency of a MIDI note number (69 = A4 = 440 Hz). */
export function midiToHz(note: number): number {
	return 440 * 2 ** ((note - 69) / 12);
}
