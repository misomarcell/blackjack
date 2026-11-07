import type { HandResult } from '@blackjack/shared/blackjack';
import { midiToHz, noise, tone } from './synth';

/** The table's sound effects, each a few synthesized notes or noise bursts starting at `at`. */

type Effect = (ctx: BaseAudioContext, out: AudioNode, at: number) => void;

/** A card sliding across felt, then landing. */
export const cardSlide: Effect = (ctx, out, at) => {
	noise(ctx, out, { start: at, duration: 0.16, gain: 0.35, freq: 2400, q: 0.7 });
	noise(ctx, out, { start: at + 0.14, duration: 0.05, gain: 0.25, freq: 1100, q: 1.5 });
};

/** Two clay chips clicking together. */
export const chipClick: Effect = (ctx, out, at) => {
	tone(ctx, out, { freq: 2650, start: at, duration: 0.08, gain: 0.12 });
	tone(ctx, out, { freq: 3400, start: at + 0.035, duration: 0.09, gain: 0.08 });
	noise(ctx, out, { start: at, duration: 0.04, gain: 0.2, freq: 5000, q: 2 });
};

/** A soft two-note bell when it is the viewer's move. */
export const turnChime: Effect = (ctx, out, at) => {
	tone(ctx, out, { freq: midiToHz(81), start: at, duration: 0.5, gain: 0.1 });
	tone(ctx, out, { freq: midiToHz(88), start: at + 0.12, duration: 0.6, gain: 0.08 });
};

function arpeggio(ctx: BaseAudioContext, out: AudioNode, at: number, notes: number[]): void {
	notes.forEach((note, index) =>
		tone(ctx, out, {
			freq: midiToHz(note),
			start: at + index * 0.09,
			duration: 0.35,
			gain: 0.12,
			type: 'triangle',
		}),
	);
}

const win: Effect = (ctx, out, at) => arpeggio(ctx, out, at, [72, 76, 79, 84]);

const blackjack: Effect = (ctx, out, at) => arpeggio(ctx, out, at, [72, 76, 79, 84, 88, 91]);

const push: Effect = (ctx, out, at) => arpeggio(ctx, out, at, [72, 72]);

/** A gentle "wah-wah" slide down. */
const lose: Effect = (ctx, out, at) => {
	tone(ctx, out, {
		freq: midiToHz(67),
		glideTo: midiToHz(64),
		start: at,
		duration: 0.3,
		gain: 0.12,
		type: 'triangle',
	});
	tone(ctx, out, {
		freq: midiToHz(63),
		glideTo: midiToHz(58),
		start: at + 0.3,
		duration: 0.6,
		gain: 0.12,
		type: 'triangle',
	});
};

export const resultSounds: Record<HandResult, Effect> = { blackjack, win, push, lose, bust: lose };
