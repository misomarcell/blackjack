import { Component, computed, DestroyRef, effect, inject, input, signal, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import type { ClientMessage, PlayerAction, SeatView } from '@blackjack/shared/protocol';
import {
	AuthStore,
	PageTitle,
	type PageTitleInfo,
	TablesApi,
	TableSession,
} from '@blackjack/web/data-access';
import { BlackjackTable } from '@blackjack/web/table-canvas';
import { Countdown, formatDollars } from '@blackjack/web/ui';
import { ActionBar } from '../action-bar/action-bar';
import { BetPanel } from '../bet-panel/bet-panel';
import { ChatPanel } from '../chat-panel/chat-panel';
import { InsurancePrompt } from '../insurance-prompt/insurance-prompt';
import { SeatTabs } from '../seat-tabs/seat-tabs';
import { TableLog } from '../table-log/table-log';
import { TableStatus } from '../table-status/table-status';

const TOAST_MS = 2500;

/** The table screen: the PixiJS table with Angular controls and chat layered on top. */
@Component({
	selector: 'bj-table-page',
	imports: [
		RouterLink,
		BlackjackTable,
		TableStatus,
		BetPanel,
		ActionBar,
		InsurancePrompt,
		SeatTabs,
		TableLog,
		ChatPanel,
		Countdown,
	],
	providers: [TableSession],
	templateUrl: './table-page.html',
	styleUrl: './table-page.scss',
})
export class TablePage {
	private readonly api = inject(TablesApi);
	private readonly router = inject(Router);
	private readonly pageTitle = inject(PageTitle);
	protected readonly session = inject(TableSession);
	protected readonly auth = inject(AuthStore);

	/** Table id from the route, so every table has its own shareable URL. */
	readonly id = input.required<string>();

	protected readonly notFound = signal(false);
	protected readonly toast = signal<string | null>(null);
	protected readonly viewerId = computed(() => this.auth.user()?.id ?? null);

	/** The seat the viewer picked to put chips on, when they hold several. */
	protected readonly pickedSeat = signal<number | null>(null);
	protected readonly bettingOpen = computed(() => {
		const phase = this.session.table()?.phase;
		return phase === 'idle' || phase === 'betting';
	});

	/** The viewer's seats still taking chips: all of them until they place their bets. */
	protected readonly openSeats = computed(() => this.session.mySeats().filter((seat) => !seat.ready));
	protected readonly betSeat = computed(() => {
		const seats = this.openSeats();
		return seats.find((seat) => seat.index === this.pickedSeat()) ?? seats[0] ?? null;
	});

	protected readonly canBet = computed(
		() =>
			this.bettingOpen() &&
			this.betSeat() !== null &&
			this.openSeats().length === this.session.mySeats().length,
	);

	protected readonly waitingForOthers = computed(
		() => this.bettingOpen() && this.session.mySeats().some((seat) => seat.ready),
	);

	/** "Place bet" confirms every seat with at least the minimum on it. */
	protected readonly canPlace = computed(() => {
		const minBet = this.session.table()?.minBet ?? 0;
		return this.openSeats().some((seat) => seat.bet >= minBet);
	});

	/** The viewer's next seat that still has to decide on insurance. */
	protected readonly insuranceSeat = computed(() =>
		this.session.table()?.phase === 'insurance'
			? (this.session.mySeats().find((seat) => seat.insurance === null && seat.hands[0]) ?? null)
			: null,
	);

	/** Half of the first hand's bet, when the viewer still has to decide on insurance. */
	protected readonly insuranceCost = computed(() => {
		const hand = this.insuranceSeat()?.hands[0];
		return hand ? hand.bet / 2 : null;
	});

	/** Names the seat in prompts, but only when the viewer holds more than one. */
	protected seatLabel(seat: SeatView | null): string {
		return seat && this.session.mySeats().length > 1 ? `Seat ${seat.index + 1}` : '';
	}

	/** Whether the bottom card has anything to show (bets, waiting, insurance or moves). */
	protected readonly hudShown = computed(
		() =>
			this.canBet() ||
			this.waitingForOthers() ||
			this.insuranceCost() !== null ||
			this.session.myTurnHand() !== null,
	);

	/** The table is waiting on the viewer's decision. */
	protected readonly needsMyMove = computed(
		() => this.insuranceCost() !== null || this.session.myTurnHand() !== null,
	);

	constructor() {
		effect(() => {
			const id = this.id();
			untracked(() => void this.open(id));
		});
		effect(() => {
			if (this.session.closed()) {
				void this.router.navigateByUrl('/lobby');
			}
		});
		effect(() => this.pageTitle.current.set(this.titleInfo()));
		inject(DestroyRef).onDestroy(() => this.pageTitle.current.set(null));
		effect((onCleanup) => {
			const error = this.session.error();
			this.toast.set(error?.message ?? null);
			const timer = setTimeout(() => this.toast.set(null), TOAST_MS);
			onCleanup(() => clearTimeout(timer));
		});
	}

	/** Phones show the table name and back button in the app bar instead of over the table. */
	private titleInfo(): PageTitleInfo | null {
		const table = this.session.table();
		return table
			? {
					title: table.name,
					subtitle: `${formatDollars(table.minBet)} – ${formatDollars(table.maxBet)}`,
					backLink: '/lobby',
				}
			: null;
	}

	protected send(message: ClientMessage): void {
		this.session.send(message);
	}

	protected act(action: PlayerAction): void {
		const seat = this.session.myTurnSeat();
		if (seat) {
			this.send({ type: 'action', seat: seat.index, action });
		}
	}

	protected placeBets(): void {
		const minBet = this.session.table()?.minBet ?? 0;
		this.openSeats()
			.filter((seat) => seat.bet >= minBet)
			.forEach((seat) => this.send({ type: 'ready', seat: seat.index }));
	}

	protected leaveSeats(): void {
		this.session.mySeats().forEach((seat) => this.send({ type: 'leave-seat', seat: seat.index }));
	}

	private async open(id: string): Promise<void> {
		try {
			await this.api.find(id);
			this.session.connect(id);
		} catch {
			this.notFound.set(true);
		}
	}
}
