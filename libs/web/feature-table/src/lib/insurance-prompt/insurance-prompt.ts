import { Component, input, output } from '@angular/core';
import { formatDollars } from '@blackjack/web/ui';

/** Offered when the dealer shows an ace: a side bet of half the stake that pays 2:1 on dealer blackjack. */
@Component({
	selector: 'bj-insurance-prompt',
	templateUrl: './insurance-prompt.html',
	styleUrl: './insurance-prompt.scss',
})
export class InsurancePrompt {
	readonly cost = input.required<number>();
	readonly affordable = input.required<boolean>();
	readonly decide = output<boolean>();

	protected readonly dollars = formatDollars;
}
