import { effect, Service, signal } from '@angular/core';
import type { HandResult } from '@blackjack/shared/blackjack';
import type { SceneSounds } from '../scene/sounds';
import { cardSlide, chipClick, resultSounds, turnChime } from './effects';
import { JazzLoop } from './jazz';

type Effect = (ctx: BaseAudioContext, out: AudioNode, at: number) => void;

const SOUND_KEY = 'bj-sound';
const MUSIC_KEY = 'bj-music';
const UNLOCK_EVENTS = ['pointerdown', 'keydown'] as const;

function readSetting(key: string): boolean {
	try {
		return localStorage.getItem(key) !== 'off';
	} catch {
		return true;
	}
}

function saveSetting(key: string, on: boolean): void {
	try {
		localStorage.setItem(key, on ? 'on' : 'off');
	} catch {
		// Private mode: the choice just does not survive a reload.
	}
}

/**
 * Sound effects and background music for the table. Browsers only allow audio after the player
 * interacts with the page, so the audio context starts on the first click or key press.
 */
@Service()
export class TableAudio implements SceneSounds {
	readonly soundOn = signal(readSetting(SOUND_KEY));
	readonly musicOn = signal(readSetting(MUSIC_KEY));

	private ctx: AudioContext | null = null;
	private effectsOut: GainNode | null = null;
	private jazz: JazzLoop | null = null;
	private atTable = false;
	private readonly unlock = (): void => void this.resume();

	constructor() {
		effect(() => saveSetting(SOUND_KEY, this.soundOn()));
		effect(() => {
			saveSetting(MUSIC_KEY, this.musicOn());
			this.syncMusic();
		});
	}

	/** Music plays only while a table screen is open. */
	enterTable(): void {
		this.atTable = true;
		UNLOCK_EVENTS.forEach((type) => document.addEventListener(type, this.unlock));
		if (this.ctx) {
			void this.resume();
		}
	}

	leaveTable(): void {
		this.atTable = false;
		UNLOCK_EVENTS.forEach((type) => document.removeEventListener(type, this.unlock));
		this.syncMusic();
	}

	card(): void {
		this.play(cardSlide);
	}

	chip(): void {
		this.play(chipClick);
	}

	result(result: HandResult): void {
		this.play(resultSounds[result]);
	}

	yourTurn(): void {
		this.play(turnChime);
	}

	private play(sound: Effect): void {
		if (this.soundOn() && this.ctx?.state === 'running' && this.effectsOut) {
			sound(this.ctx, this.effectsOut, this.ctx.currentTime);
		}
	}

	private async resume(): Promise<void> {
		this.ctx ??= this.createContext();
		if (this.ctx.state !== 'running') {
			await this.ctx.resume().catch(() => undefined);
		}
		this.syncMusic();
	}

	private createContext(): AudioContext {
		const ctx = new AudioContext();
		const master = ctx.createDynamicsCompressor();
		master.connect(ctx.destination);
		this.effectsOut = ctx.createGain();
		this.effectsOut.gain.value = 0.8;
		this.effectsOut.connect(master);
		this.jazz = new JazzLoop(ctx, master);
		return ctx;
	}

	private syncMusic(): void {
		const wanted = this.atTable && this.musicOn() && this.ctx?.state === 'running';
		if (wanted) {
			this.jazz?.start();
		} else if (this.jazz?.playing) {
			this.jazz.stop();
		}
	}
}
