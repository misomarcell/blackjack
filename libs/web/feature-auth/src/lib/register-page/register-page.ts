import { Component, inject, input, signal } from '@angular/core';
import {
	email,
	form,
	FormField,
	FormRoot,
	maxLength,
	minLength,
	pattern,
	required,
	type TreeValidationResult,
} from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { apiErrorMessage, AuthStore } from '@blackjack/web/data-access';
import { CardFan, FieldError } from '@blackjack/web/ui';
import { safeReturnUrl } from '../return-url';

const USERNAME_PATTERN = /^[\p{L}\p{N}_.-]+$/u;

@Component({
	selector: 'bj-register-page',
	imports: [FormField, FormRoot, RouterLink, FieldError, CardFan],
	templateUrl: './register-page.html',
	styleUrl: './register-page.scss',
})
export class RegisterPage {
	private readonly auth = inject(AuthStore);
	private readonly router = inject(Router);

	readonly returnUrl = input<string>();

	protected readonly showPassword = signal(false);
	private readonly model = signal({ username: '', email: '', password: '' });

	protected readonly registerForm = form(
		this.model,
		(path) => {
			required(path.username, { message: 'Pick a username' });
			minLength(path.username, 3, { message: 'At least 3 characters' });
			maxLength(path.username, 24, { message: 'At most 24 characters' });
			pattern(path.username, USERNAME_PATTERN, {
				message: 'Letters, numbers, dots, dashes or underscores',
			});
			required(path.email, { message: 'Enter your e-mail' });
			email(path.email, { message: 'Enter a valid e-mail' });
			required(path.password, { message: 'Choose a password' });
			minLength(path.password, 8, { message: 'At least 8 characters' });
		},
		{ submission: { action: () => this.createAccount() } },
	);

	private async createAccount(): Promise<TreeValidationResult> {
		try {
			await this.auth.register(this.model());
			await this.router.navigateByUrl(safeReturnUrl(this.returnUrl()));
			return undefined;
		} catch (error) {
			return { kind: 'server', message: apiErrorMessage(error) };
		}
	}
}
