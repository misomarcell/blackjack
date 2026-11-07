import { HttpClient } from '@angular/common/http';
import { computed, inject, Service, signal } from '@angular/core';
import type { Credentials, Registration, User } from '@blackjack/shared/protocol';
import { firstValueFrom } from 'rxjs';

/** The signed-in player and their balance. The session itself lives in an httpOnly cookie. */
@Service()
export class AuthStore {
	private readonly http = inject(HttpClient);
	private readonly current = signal<User | null>(null);

	readonly user = this.current.asReadonly();
	readonly signedIn = computed(() => this.current() !== null);
	readonly isAdmin = computed(() => this.current()?.isAdmin ?? false);
	readonly balance = computed(() => this.current()?.balance ?? 0);

	/** Restores the session on app start. */
	async restore(): Promise<void> {
		try {
			this.current.set(await firstValueFrom(this.http.get<User>('/api/auth/me')));
		} catch {
			this.current.set(null);
		}
	}

	async login(credentials: Credentials): Promise<void> {
		this.current.set(await firstValueFrom(this.http.post<User>('/api/auth/login', credentials)));
	}

	async register(registration: Registration): Promise<void> {
		this.current.set(await firstValueFrom(this.http.post<User>('/api/auth/register', registration)));
	}

	async logout(): Promise<void> {
		await firstValueFrom(this.http.post('/api/auth/logout', {}));
		this.current.set(null);
	}

	async refill(): Promise<void> {
		const { balance } = await firstValueFrom(
			this.http.post<{ balance: number }>('/api/wallet/refill', {}),
		);
		this.setBalance(balance);
	}

	setBalance(balance: number): void {
		this.current.update((user) => (user ? { ...user, balance } : user));
	}
}
