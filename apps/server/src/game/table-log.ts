import { type Card, handTotal } from '@blackjack/shared/blackjack';
import type { LogEntry, LogPart } from '@blackjack/shared/protocol';
import type { Seat } from './model';

const HISTORY = 60;

/** Plain strings are ordinary text; parts carry a highlight tone. */
export type LogFragment = string | LogPart;

export const dealerName: LogPart = { tone: 'dealer', text: 'Dealer' };

export function who(seat: Seat): LogPart {
	return { tone: 'player', text: seat.player?.username ?? 'Someone' };
}

/** "$25", "$7.50" or "-$50". */
export function money(amount: number): LogPart {
	const abs = Math.abs(amount);
	const text = Number.isInteger(abs) ? String(abs) : abs.toFixed(2);
	return { tone: 'money', text: `${amount < 0 ? '-' : ''}$${text}` };
}

export function value(text: string | number): LogPart {
	return { tone: 'value', text: String(text) };
}

/** A hand total as players say it: "12", "soft 17". */
export function total(cards: Card[]): LogPart {
	const { total: sum, soft } = handTotal(cards);
	return value(soft && sum < 21 ? `soft ${sum}` : sum);
}

/** Recent table events, kept in memory and pushed to every client as they happen. */
export class TableLog {
	private readonly entries: LogEntry[] = [];
	private nextId = 1;

	constructor(private readonly publish: (entry: LogEntry) => void) {}

	add(...fragments: LogFragment[]): void {
		const parts = fragments.map((fragment): LogPart =>
			typeof fragment === 'string' ? { tone: 'text', text: fragment } : fragment,
		);
		const entry = { id: this.nextId++, parts };
		this.entries.push(entry);
		if (this.entries.length > HISTORY) {
			this.entries.shift();
		}
		this.publish(entry);
	}

	recent(): LogEntry[] {
		return [...this.entries];
	}
}
