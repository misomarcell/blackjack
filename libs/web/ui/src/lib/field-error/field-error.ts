import { Component, computed, input } from '@angular/core';
import type { FieldTree } from '@angular/forms/signals';

/** Shows the first validation message of a field once the user has touched it. */
@Component({
	selector: 'bj-field-error',
	templateUrl: './field-error.html',
	styleUrl: './field-error.scss',
})
export class FieldError {
	readonly field = input.required<FieldTree<unknown>>();

	protected readonly message = computed(() => {
		const state = this.field()();
		return state.touched() ? (state.errors()[0]?.message ?? null) : null;
	});
}
