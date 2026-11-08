import { Component, type ElementRef, inject, input, output, signal, viewChild } from '@angular/core';
import type { LogEntry } from '@blackjack/shared/protocol';
import { TableAudio } from '@blackjack/web/table-canvas';
import { Icon } from '@blackjack/web/ui';
import { LogLines } from '../log-lines/log-lines';

/** Phones: one round button that opens the sound, music, share and seat controls plus the table log. */
@Component({
	selector: 'bj-table-menu',
	imports: [Icon, LogLines],
	templateUrl: './table-menu.html',
	styleUrl: './table-menu.scss',
})
export class TableMenu {
	readonly log = input.required<LogEntry[]>();
	readonly seated = input(false);
	/** The share link was just copied. */
	readonly copied = input(false);
	readonly share = output();
	readonly leaveSeat = output();

	protected readonly audio = inject(TableAudio);
	protected readonly open = signal(false);
	private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

	protected show(): void {
		this.dialog().nativeElement.showModal();
		this.open.set(true);
	}

	protected close(): void {
		this.dialog().nativeElement.close();
	}

	protected standUp(): void {
		this.leaveSeat.emit();
		this.close();
	}
}
