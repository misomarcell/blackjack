import { type Card, RANKS, type Rank, SUITS, type Suit } from './card';

export type RandomFn = () => number;

interface RawCard {
	rank: Rank;
	suit: Suit;
}

const RESHUFFLE_RATIO = 0.25;

const cryptoRandom: RandomFn = () => (crypto.getRandomValues(new Uint32Array(1))[0] ?? 0) / 2 ** 32;

function buildDecks(decks: number): RawCard[] {
	return Array.from({ length: decks }).flatMap(() =>
		SUITS.flatMap((suit) => RANKS.map((rank) => ({ rank, suit }))),
	);
}

/** A multi-deck shoe that hands out uniquely identified cards and reshuffles at the cut card. */
export class Shoe {
	private cards: RawCard[] = [];
	private seq = 0;

	constructor(
		private readonly decks = 6,
		private readonly random: RandomFn = cryptoRandom,
	) {
		this.shuffle();
	}

	get needsShuffle(): boolean {
		return this.cards.length < this.decks * 52 * RESHUFFLE_RATIO;
	}

	shuffle(): void {
		const cards = buildDecks(this.decks);
		for (let i = cards.length - 1; i > 0; i--) {
			const j = Math.floor(this.random() * (i + 1));
			[cards[i], cards[j]] = [cards[j] as RawCard, cards[i] as RawCard];
		}
		this.cards = cards;
	}

	draw(): Card {
		const raw = this.cards.pop() ?? this.reshuffleAndDraw();
		this.seq++;
		return { ...raw, id: `c${this.seq}`, seq: this.seq };
	}

	private reshuffleAndDraw(): RawCard {
		this.shuffle();
		return this.cards.pop() as RawCard;
	}
}
