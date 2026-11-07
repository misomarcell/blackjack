import type { HandResult } from '@blackjack/shared/blackjack';

/** What the scene asks to hear. The scene decides when (it knows the animations); the player decides how. */
export interface SceneSounds {
	card(): void;
	chip(): void;
	result(result: HandResult): void;
	yourTurn(): void;
}
