import { Component, inject, input, signal } from '@angular/core';
import { form, FormField, FormRoot, required, type TreeValidationResult } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { apiErrorMessage, AuthStore } from '@blackjack/web/data-access';
import { FieldError } from '@blackjack/web/ui';
import { safeReturnUrl } from '../return-url';

@Component({
	selector: 'bj-login-page',
	imports: [FormField, FormRoot, RouterLink, FieldError],
	templateUrl: './login-page.html',
	styleUrl: './login-page.scss',
})
export class LoginPage {
	private readonly auth = inject(AuthStore);
	private readonly router = inject(Router);

	/** Bound from the `?returnUrl=` query param, e.g. a shared table link. */
	readonly returnUrl = input<string>();

	protected readonly showPassword = signal(false);
	private readonly model = signal({ username: '', password: '' });

	protected readonly loginForm = form(
		this.model,
		(path) => {
			required(path.username, { message: 'Enter your username' });
			required(path.password, { message: 'Enter your password' });
		},
		{ submission: { action: () => this.signIn() } },
	);

	private async signIn(): Promise<TreeValidationResult> {
		try {
			await this.auth.login(this.model());
			await this.router.navigateByUrl(safeReturnUrl(this.returnUrl()));
			return undefined;
		} catch (error) {
			return { kind: 'server', message: apiErrorMessage(error) };
		}
	}
}
