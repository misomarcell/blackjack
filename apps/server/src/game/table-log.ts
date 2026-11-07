import { type Card, handTotal } from '@blackjack/shared/blackjack';
import type { LogEntry, LogPart } from '@blackjack/shared/protocol';
import type { Seat } from './model';

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

/** Where log lines are kept. Ids come from the store, so every client and the history agree. */
export interface LogStore {
	add(tableId: string, parts: LogPart[]): Promise<number>;
	recent(tableId: string): Promise<LogEntry[]>;
}

/**
 * Table events, written to the store in order and pushed to every client once saved.
 * Game code calls `add` synchronously; the writes queue up behind each other.
 */
export class TableLog {
	private queue: Promise<void> = Promise.resolve();
	/** Fallback ids for lines the store could not save, counting down so they never clash. */
	private unsavedId = -1;

	constructor(
		private readonly tableId: string,
		private readonly store: LogStore,
		private readonly publish: (entry: LogEntry) => void,
	) {}

	add(...fragments: LogFragment[]): void {
		const parts = fragments.map((fragment): LogPart =>
			typeof fragment === 'string' ? { tone: 'text', text: fragment } : fragment,
		);
		this.queue = this.queue.then(() => this.save(parts));
	}

	recent(): Promise<LogEntry[]> {
		return this.store.recent(this.tableId);
	}

	/** Resolves once every line added so far has been saved and published. */
	flushed(): Promise<void> {
		return this.queue;
	}

	private async save(parts: LogPart[]): Promise<void> {
		let id: number;
		try {
			id = await this.store.add(this.tableId, parts);
		} catch (error) {
			console.error('Could not save a table log line', error);
			id = this.unsavedId--;
		}
		this.publish({ id, parts });
	}
}
