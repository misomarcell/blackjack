import { Component, computed, effect, input, signal } from '@angular/core';
import type { LogEntry } from '@blackjack/shared/protocol';
import { FloatingPanel } from '@blackjack/web/ui';
import { LogLines } from '../log-lines/log-lines';

/** Everything that happens at the table, in a corner panel that starts collapsed with an unread badge. */
@Component({
	selector: 'bj-table-log',
	imports: [FloatingPanel, LogLines],
	templateUrl: './table-log.html',
	styleUrl: './table-log.scss',
})
export class TableLog {
	readonly entries = input.required<LogEntry[]>();

	/** Starts collapsed; the unread badge tells when something happened. */
	protected readonly open = signal(false);
	/** Lines after this id count as unread while the panel is collapsed. */
	private readonly seenId = signal(0);
	protected readonly unread = computed(() => {
		const seenId = this.seenId();
		return this.open() ? 0 : this.entries().filter((entry) => entry.id > seenId).length;
	});

	constructor() {
		effect(() => {
			const last = this.entries().at(-1);
			if (this.open() && last) {
				this.seenId.set(last.id);
			}
		});
	}
}
