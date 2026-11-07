import { Component, type ElementRef, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { TableSummary } from '@blackjack/shared/protocol';
import { apiErrorMessage, LobbyFeed, TablesApi } from '@blackjack/web/data-access';
import { formatDollars } from '@blackjack/web/ui';
import { TableFormDialog } from '../table-form-dialog/table-form-dialog';

/** Admin list of tables with create, edit and delete. The list is the live lobby feed. */
@Component({
	selector: 'bj-admin-tables-page',
	imports: [RouterLink, TableFormDialog],
	providers: [LobbyFeed],
	templateUrl: './admin-tables-page.html',
	styleUrl: './admin-tables-page.scss',
})
export class AdminTablesPage {
	private readonly api = inject(TablesApi);
	private readonly confirmDialog = viewChild.required<ElementRef<HTMLDialogElement>>('confirmDelete');

	protected readonly feed = inject(LobbyFeed);
	protected readonly dollars = formatDollars;
	protected readonly pendingDelete = signal<TableSummary | null>(null);
	protected readonly error = signal<string | null>(null);

	protected askDelete(table: TableSummary): void {
		this.pendingDelete.set(table);
		this.confirmDialog().nativeElement.showModal();
	}

	/** Reads which button closed the confirm dialog, then resets it as the dialog guide recommends. */
	protected async onConfirmClosed(dialog: HTMLDialogElement): Promise<void> {
		const table = this.pendingDelete();
		const confirmed = dialog.returnValue === 'delete';
		dialog.returnValue = '';
		this.pendingDelete.set(null);
		if (!confirmed || !table) {
			return;
		}
		try {
			await this.api.remove(table.id);
			this.error.set(null);
		} catch (error) {
			this.error.set(apiErrorMessage(error));
		}
	}
}
