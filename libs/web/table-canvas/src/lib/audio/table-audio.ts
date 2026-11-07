import { effect, Service, signal } from '@angular/core';
import type { HandResult } from '@blackjack/shared/blackjack';
import type { SceneSounds } from '../scene/sounds';
import { MusicPlayer } from './music-player';
import { type EffectName, RESULT_EFFECTS, SoundEffects } from './sound-effects';

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
 * interacts with the page, so everything starts on the first click or key press at a table.
 */
@Service()
export class TableAudio implements SceneSounds {
	readonly soundOn = signal(readSetting(SOUND_KEY));
	readonly musicOn = signal(readSetting(MUSIC_KEY));

	private ctx: AudioContext | null = null;
	private effects: SoundEffects | null = null;
	private music: MusicPlayer | null = null;
	private atTable = false;
	/** True once the player has interacted, so playback is allowed. */
	private unlocked = false;
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
		this.syncMusic();
	}

	leaveTable(): void {
		this.atTable = false;
		UNLOCK_EVENTS.forEach((type) => document.removeEventListener(type, this.unlock));
		this.syncMusic();
	}

	card(): void {
		this.play('card');
	}

	chip(): void {
		this.play('chip');
	}

	result(result: HandResult): void {
		this.play(RESULT_EFFECTS[result]);
	}

	yourTurn(): void {
		this.play('turn');
	}

	private play(name: EffectName): void {
		if (this.soundOn()) {
			this.effects?.play(name);
		}
	}

	private async resume(): Promise<void> {
		this.unlocked = true;
		this.ctx ??= new AudioContext();
		this.effects ??= new SoundEffects(this.ctx);
		this.syncMusic();
		if (this.ctx.state !== 'running') {
			await this.ctx.resume().catch(() => undefined);
		}
		await this.effects.load();
	}

	private syncMusic(): void {
		if (this.atTable && this.musicOn() && this.unlocked) {
			this.music ??= new MusicPlayer();
			this.music.play();
		} else if (this.music?.playing) {
			this.music.pause();
		}
	}
}
