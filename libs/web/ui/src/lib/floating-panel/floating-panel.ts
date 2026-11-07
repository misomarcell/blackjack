import { Component, input, model } from '@angular/core';

let nextId = 0;

/**
 * A corner panel over the table. Collapsed it is only a small see-through button with an unread badge,
 * so it never covers chips or actions; open it shows its projected content.
 */
@Component({
	selector: 'bj-floating-panel',
	templateUrl: './floating-panel.html',
	styleUrl: './floating-panel.scss',
})
export class FloatingPanel {
	readonly heading = input.required<string>();
	/** A short glyph shown on the collapsed button. */
	readonly icon = input.required<string>();
	readonly badge = input(0);
	readonly open = model(false);

	protected readonly bodyId = `floating-panel-${nextId++}`;
}
