import { Component, computed, type ElementRef, inject, viewChild } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthStore, PageTitle } from '@blackjack/web/data-access';
import { BalanceDisplay, Icon } from '@blackjack/web/ui';
import { RefillButton } from '../refill-button/refill-button';

@Component({
	selector: 'bj-top-bar',
	imports: [RouterLink, RouterLinkActive, BalanceDisplay, Icon, RefillButton],
	templateUrl: './top-bar.html',
	styleUrl: './top-bar.scss',
	host: {
		'[class.with-page]': 'pageTitle.current() !== null',
		'(document:click)': 'closeMenuOutside($event)',
	},
})
export class TopBar {
	private readonly router = inject(Router);
	protected readonly auth = inject(AuthStore);
	protected readonly pageTitle = inject(PageTitle);
	protected readonly initial = computed(() => this.auth.user()?.username.charAt(0) ?? '?');
	private readonly navMenu = viewChild<ElementRef<HTMLDetailsElement>>('navMenu');

	/** The phone menu closes when you tap anywhere else, like any dropdown. */
	protected closeMenuOutside(event: MouseEvent): void {
		const menu = this.navMenu()?.nativeElement;
		if (menu?.open && !menu.contains(event.target as Node)) {
			menu.open = false;
		}
	}
	protected async logout(): Promise<void> {
		await this.auth.logout();
		await this.router.navigateByUrl('/login');
	}
}
