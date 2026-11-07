import { Component, input, model } from '@angular/core';
import { Icon, type IconName } from '../icon/icon';

let nextId = 0;

/**
 * A corner panel over the table. Collapsed it is only a small round button with an unread badge,
 * so it never covers chips or actions; open it shows its projected content.
 */
@Component({
	selector: 'bj-floating-panel',
	templateUrl: './floating-panel.html',
	styleUrl: './floating-panel.scss',
	imports: [Icon],
})
export class FloatingPanel {
	readonly heading = input.required<string>();
	/** The icon on the collapsed button. */
	readonly icon = input.required<IconName>();
	readonly badge = input(0);
	readonly open = model(false);

	protected readonly bodyId = `floating-panel-${nextId++}`;
}
