import { Component, type ElementRef, inject, output, signal, viewChild } from '@angular/core';
import {
	form,
	FormField,
	FormRoot,
	max,
	maxLength,
	min,
	minLength,
	required,
	type TreeValidationResult,
	validate,
} from '@angular/forms/signals';
import type { TableConfig } from '@blackjack/shared/protocol';
import { apiErrorMessage, TablesApi } from '@blackjack/web/data-access';
import { FieldError } from '@blackjack/web/ui';

const NEW_TABLE: TableConfig = { name: '', minBet: 10, maxBet: 1000 };

/** Create / edit form for a table, shown in a native modal dialog. */
@Component({
	selector: 'bj-table-form-dialog',
	imports: [FormField, FormRoot, FieldError],
	templateUrl: './table-form-dialog.html',
	styleUrl: './table-form-dialog.scss',
})
export class TableFormDialog {
	private readonly api = inject(TablesApi);
	private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

	readonly saved = output();

	protected readonly editingId = signal<string | null>(null);
	private readonly model = signal<TableConfig>(NEW_TABLE);

	protected readonly tableForm = form(
		this.model,
		(path) => {
			required(path.name, { message: 'Give the table a name' });
			minLength(path.name, 2, { message: 'At least 2 characters' });
			maxLength(path.name, 40, { message: 'At most 40 characters' });
			min(path.minBet, 5, { message: 'The smallest chip is $5' });
			max(path.maxBet, 100_000, { message: 'Keep it under $100,000' });
			validate(path.maxBet, ({ value, valueOf }) =>
				value() < valueOf(path.minBet)
					? { kind: 'range', message: 'Must be at least the min bet' }
					: undefined,
			);
		},
		{ submission: { action: () => this.save() } },
	);

	open(table?: TableConfig & { id: string }): void {
		this.editingId.set(table?.id ?? null);
		this.tableForm().reset(
			table ? { name: table.name, minBet: table.minBet, maxBet: table.maxBet } : NEW_TABLE,
		);
		this.dialog().nativeElement.showModal();
	}

	protected close(): void {
		this.dialog().nativeElement.close();
	}

	private async save(): Promise<TreeValidationResult> {
		const id = this.editingId();
		try {
			await (id ? this.api.update(id, this.model()) : this.api.create(this.model()));
			this.close();
			this.saved.emit();
			return undefined;
		} catch (error) {
			return { kind: 'server', message: apiErrorMessage(error) };
		}
	}
}
