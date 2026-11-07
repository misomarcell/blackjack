import type { HandResult } from '@blackjack/shared/blackjack';

/** Effect files served from apps/web/public/audio/sfx. */
const FILES = {
	card: '/audio/sfx/card.wav',
	chip: '/audio/sfx/chip.wav',
	turn: '/audio/sfx/turn.wav',
	win: '/audio/sfx/win.wav',
	blackjack: '/audio/sfx/blackjack.wav',
	push: '/audio/sfx/push.wav',
	lose: '/audio/sfx/lose.wav',
};
const VOLUME = 0.8;

export type EffectName = keyof typeof FILES;

export const RESULT_EFFECTS: Record<HandResult, EffectName> = {
	blackjack: 'blackjack',
	win: 'win',
	push: 'push',
	lose: 'lose',
	bust: 'lose',
};

/**
 * Short sounds decoded once into Web Audio buffers, so a fast deal can fire many overlapping cards
 * without the delay an <audio> element has. Needs a running AudioContext (after a user gesture).
 */
export class SoundEffects {
	private readonly buffers = new Map<EffectName, AudioBuffer>();
	private readonly output: GainNode;
	private loading: Promise<void> | null = null;

	constructor(private readonly ctx: AudioContext) {
		this.output = ctx.createGain();
		this.output.gain.value = VOLUME;
		this.output.connect(ctx.destination);
	}

	/** Fetches and decodes every file once. Files that fail to load just stay silent. */
	load(): Promise<void> {
		this.loading ??= Promise.all(
			Object.entries(FILES).map(([name, url]) => this.loadOne(name as EffectName, url)),
		).then(() => undefined);
		return this.loading;
	}

	play(name: EffectName): void {
		const buffer = this.buffers.get(name);
		if (!buffer || this.ctx.state !== 'running') {
			return;
		}
		const source = this.ctx.createBufferSource();
		source.buffer = buffer;
		source.connect(this.output);
		source.start();
	}

	private async loadOne(name: EffectName, url: string): Promise<void> {
		try {
			const response = await fetch(url);
			this.buffers.set(name, await this.ctx.decodeAudioData(await response.arrayBuffer()));
		} catch (error) {
			console.warn(`Could not load sound ${url}`, error);
		}
	}
}
