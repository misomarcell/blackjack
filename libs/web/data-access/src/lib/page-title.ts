import { Service, signal } from '@angular/core';

export interface PageTitleInfo {
	title: string;
	subtitle: string;
	backLink: string;
}

/** A title the current screen lends to the app bar, which shows it instead of the brand on phones. */
@Service()
export class PageTitle {
	readonly current = signal<PageTitleInfo | null>(null);
}
