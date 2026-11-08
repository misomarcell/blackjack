import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Service, signal } from '@angular/core';
import type { Credentials, RefillStatus, Registration, User } from '@blackjack/shared/protocol';
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
	/** `Date.now()` time when the next free refill is allowed (0 = now). */
	readonly refillReadyAt = signal(0);
	/** How far a refill tops the balance up. */
	readonly refillUpTo = computed(() => this.current()?.refill.upTo ?? 0);
	/** Refills are only for broke players, whose balance is below this. */
	readonly refillBrokeBelow = computed(() => this.current()?.refill.brokeBelow ?? 0);
	/** Chips the player has on the table they are at (the table page keeps this up to date). */
	readonly chipsInPlay = signal(0);
	/** Out of money with nothing left on the table: only then is a refill possible. */
	readonly broke = computed(
		() => this.signedIn() && this.balance() < this.refillBrokeBelow() && this.chipsInPlay() === 0,
	);

	/** Restores the session on app start. */
	async restore(): Promise<void> {
		try {
			this.signIn(await firstValueFrom(this.http.get<User>('/api/auth/me')));
		} catch {
			this.current.set(null);
		}
	}

	async login(credentials: Credentials): Promise<void> {
		this.signIn(await firstValueFrom(this.http.post<User>('/api/auth/login', credentials)));
	}

	async register(registration: Registration): Promise<void> {
		this.signIn(await firstValueFrom(this.http.post<User>('/api/auth/register', registration)));
	}

	async logout(): Promise<void> {
		await firstValueFrom(this.http.post('/api/auth/logout', {}));
		this.current.set(null);
	}

	/** The once-a-day free refill. Both answers carry the refill status, so the countdown stays right. */
	async refill(): Promise<void> {
		try {
			const { balance, refill } = await firstValueFrom(
				this.http.post<{ balance: number; refill: RefillStatus }>('/api/wallet/refill', {}),
			);
			this.setBalance(balance);
			this.trackRefill(refill);
		} catch (error) {
			if (error instanceof HttpErrorResponse && error.error?.refill) {
				this.trackRefill(error.error.refill);
			}
			throw error;
		}
	}

	private signIn(user: User): void {
		this.current.set(user);
		this.trackRefill(user.refill);
	}

	/** The server sends the wait relative to its answer, so the client clock's offset does not matter. */
	private trackRefill(refill: RefillStatus): void {
		this.refillReadyAt.set(refill.waitMs > 0 ? Date.now() + refill.waitMs : 0);
	}

	setBalance(balance: number): void {
		this.current.update((user) => (user ? { ...user, balance } : user));
	}
}
