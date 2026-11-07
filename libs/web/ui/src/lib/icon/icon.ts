import { Component, computed, input } from '@angular/core';

/** Stroke paths on a 24×24 grid, all drawn with the same round 2.5 stroke so the set reads as one family. */
const paths = {
	back: 'M19 12H5M11 18l-6-6 6-6',
	chat: 'M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z',
	'chevron-down': 'M6 9l6 6 6-6',
	close: 'M6 6l12 12M18 6 6 18',
	edit: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
	link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
	log: 'M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01',
	logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
	music: 'M9 18V5l11-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM20 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
	plus: 'M12 5v14M5 12h14',
	repeat: 'M4 12a8 8 0 0 1 13.7-5.7L20 8.5M20 4v4.5h-4.5M20 12a8 8 0 0 1-13.7 5.7L4 15.5M4 20v-4.5h4.5',
	sound: 'M11 5 6 9H3v6h3l5 4zM15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13',
	'sound-off': 'M11 5 6 9H3v6h3l5 4zM16 9l6 6M22 9l-6 6',
	trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
} as const;

export type IconName = keyof typeof paths;

/** A decorative line icon that inherits the text color. Label the button around it, not the icon. */
@Component({
	selector: 'bj-icon',
	templateUrl: './icon.html',
	styleUrl: './icon.scss',
})
export class Icon {
	readonly name = input.required<IconName>();

	protected readonly path = computed(() => paths[this.name()]);
}
