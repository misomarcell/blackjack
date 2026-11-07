import { Component, computed, input, output } from '@angular/core';
import { canDouble, canSplit, type Rank } from '@blackjack/shared/blackjack';
import type { HandView, PlayerAction } from '@blackjack/shared/protocol';

const SHORTCUTS: Record<string, PlayerAction> = { h: 'hit', s: 'stand', d: 'double', p: 'split' };

/** Hit / Stand / Double / Split for the hand in turn. Keyboard: H, S, D, P. */
@Component({
	selector: 'bj-action-bar',
	templateUrl: './action-bar.html',
	styleUrl: './action-bar.scss',
	host: { '(document:keydown)': 'onKey($event)' },
})
export class ActionBar {
	readonly hand = input.required<HandView>();
	readonly handCount = input.required<number>();
	readonly balance = input.required<number>();
	readonly act = output<PlayerAction>();

	private readonly ranks = computed(() => this.hand().cards.map((card) => ({ rank: card.rank as Rank })));
	private readonly affordable = computed(() => this.balance() >= this.hand().bet);
	protected readonly doubleAllowed = computed(() => this.affordable() && canDouble(this.ranks()));
	protected readonly splitAllowed = computed(
		() => this.affordable() && canSplit(this.ranks(), this.handCount()),
	);

	protected onKey(event: KeyboardEvent): void {
		const action = SHORTCUTS[event.key.toLowerCase()];
		const typing =
			event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement;
		if (!action || typing || !this.allowed(action)) {
			return;
		}
		this.act.emit(action);
	}

	private allowed(action: PlayerAction): boolean {
		return (action !== 'double' || this.doubleAllowed()) && (action !== 'split' || this.splitAllowed());
	}
}
