/** Background tracks served from apps/web/public/audio/music. */
const TRACKS = [
	'/audio/music/cocktail-jazz.mp3',
	'/audio/music/cocktail-jazz-2.mp3',
	'/audio/music/jazz-restaurant-1.mp3',
	'/audio/music/jazz-restaurant-2.mp3',
];
const VOLUME = 0.35;

/** Fisher–Yates shuffle that never starts with `avoid`, so a track does not play twice in a row. */
function shuffled(tracks: string[], avoid: string | undefined): string[] {
	const order = [...tracks];
	for (let i = order.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[order[i], order[j]] = [order[j] as string, order[i] as string];
	}
	if (order.length > 1 && order[0] === avoid) {
		order.push(order.shift() as string);
	}
	return order;
}

/** Plays the jazz tracks one after another in random order, reshuffling after each full pass. */
export class MusicPlayer {
	private readonly audio = new Audio();
	private queue: string[] = [];
	private current: string | undefined;

	constructor() {
		this.audio.volume = VOLUME;
		this.audio.preload = 'none';
		this.audio.addEventListener('ended', () => this.next());
		// A missing or broken file should not stop the music for good.
		this.audio.addEventListener('error', () => this.next());
	}

	get playing(): boolean {
		return !this.audio.paused;
	}

	/** Resumes the current track, or starts a random one. Browsers reject this before any user gesture. */
	play(): void {
		if (!this.current) {
			this.next();
			return;
		}
		this.audio.play().catch(() => undefined);
	}

	pause(): void {
		this.audio.pause();
	}

	private next(): void {
		if (this.queue.length === 0) {
			this.queue = shuffled(TRACKS, this.current);
		}
		this.current = this.queue.shift();
		this.audio.src = this.current ?? '';
		this.audio.play().catch(() => undefined);
	}
}
