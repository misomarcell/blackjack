import { afterRenderEffect, Component, type ElementRef, input, viewChild } from '@angular/core';
import type { LogEntry } from '@blackjack/shared/protocol';

/** The table log lines, newest at the bottom and kept scrolled there, with players and amounts highlighted. */
@Component({
	selector: 'bj-log-lines',
	templateUrl: './log-lines.html',
	styleUrl: './log-lines.scss',
})
export class LogLines {
	readonly entries = input.required<LogEntry[]>();
	/** Whether the lines are on screen; showing them again scrolls to the newest line. */
	readonly visible = input(true);

	private readonly list = viewChild.required<ElementRef<HTMLElement>>('list');

	constructor() {
		afterRenderEffect(() => {
			this.entries();
			this.visible();
			const list = this.list().nativeElement;
			list.scrollTop = list.scrollHeight;
		});
	}
}
