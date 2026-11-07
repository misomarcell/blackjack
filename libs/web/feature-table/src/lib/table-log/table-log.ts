import {
	afterRenderEffect,
	Component,
	computed,
	effect,
	type ElementRef,
	input,
	signal,
	viewChild,
} from '@angular/core';
import type { LogEntry } from '@blackjack/shared/protocol';
import { FloatingPanel } from '@blackjack/web/ui';

/** Everything that happens at the table, newest at the bottom, with players and amounts highlighted. */
@Component({
	selector: 'bj-table-log',
	imports: [FloatingPanel],
	templateUrl: './table-log.html',
	styleUrl: './table-log.scss',
})
export class TableLog {
	readonly entries = input.required<LogEntry[]>();

	private readonly list = viewChild<ElementRef<HTMLElement>>('list');
	/** Open by default only where there is room for both panels. */
	protected readonly open = signal(matchMedia('(min-height: 900px)').matches);
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
		afterRenderEffect(() => {
			this.entries();
			this.open();
			const list = this.list()?.nativeElement;
			if (list) {
				list.scrollTop = list.scrollHeight;
			}
		});
	}
}
