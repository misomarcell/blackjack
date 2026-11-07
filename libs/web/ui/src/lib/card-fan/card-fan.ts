import { Component } from '@angular/core';

/** The brand mark: three playing cards fanned out like a winning hand. Purely decorative. */
@Component({
	selector: 'bj-card-fan',
	templateUrl: './card-fan.html',
	styleUrl: './card-fan.scss',
	host: { 'aria-hidden': 'true' },
})
export class CardFan {
	protected readonly cards = [
		{ rank: 'A', suit: '♠', red: false },
		{ rank: 'K', suit: '♥', red: true },
		{ rank: 'Q', suit: '♦', red: true },
	];
}
