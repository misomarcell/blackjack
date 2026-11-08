import { SEAT_COUNT, type SeatView, type TableView } from '@blackjack/shared/protocol';
import { Application, Container } from 'pixi.js';
import { CardLayer } from './card-layer';
import { cardTargets } from './card-targets';
import { Felt } from './felt';
import { DEALER, STAGE } from './layout';
import { colors } from './palette';
import { pill } from './pill';
import { RoundSound } from './round-sound';
import { SeatSprite } from './seat-sprite';
import type { SceneSounds } from './sounds';
import { Tweener } from './tween';

/** CSS pixels kept free at the top by default for the Angular status bar, so it never covers the dealer. */
const DEFAULT_TOP_INSET = 56;
/** The part of the stage that is shown: all of it, or (compact, for short phone screens) only the band
 * from the dealer's title to the seat names, leaving out the empty felt along the rail. */
const FULL_VIEW = { top: 0, bottom: STAGE.height };
const COMPACT_VIEW = { top: 30, bottom: 790 };

/** How the table is framed in its canvas. */
export interface TableFraming {
	/** CSS pixels kept free above the table for overlays. */
	topInset: number;
	compact: boolean;
}
/** Seats and labels grow up to this much on small screens, so they stay readable on a phone. */
const MAX_UI_SCALE = 1.7;
/** The on-screen size (world scale) below which seats start to grow. */
const READABLE_SCALE = 0.55;

function isViewerSeat(seat: SeatView, viewerId: number | null): boolean {
	return seat.player !== null && seat.player.userId === viewerId;
}

/** The viewer's seat whose insurance question is open, so its hand can be pointed at like a turn. */
function insuranceSeat(table: TableView, viewerId: number | null): number | null {
	if (table.phase !== 'insurance') {
		return null;
	}
	const seat = table.seats.find(
		(candidate) =>
			isViewerSeat(candidate, viewerId) && candidate.insurance === null && candidate.hands.length > 0,
	);
	return seat?.index ?? null;
}

/** The hand being decided at a seat: the one in turn, or the hand being insured. */
function decidingHand(table: TableView, seat: SeatView, insuring: number | null): number | null {
	if (table.turn?.seat === seat.index) {
		return table.turn.hand;
	}
	return seat.index === insuring ? 0 : null;
}

/** The whole PixiJS table. Angular feeds it snapshots through `render`; it never talks to the server. */
export class TableScene {
	private readonly world = new Container();
	private readonly felt = new Felt();
	private readonly dealerLabels = new Container();
	private readonly tweener: Tweener;
	private readonly cards: CardLayer;
	private readonly seats: SeatSprite[];
	private labelTimer: ReturnType<typeof setTimeout> | undefined;
	private readonly dealerTitle = pill('DEALER', colors.ink);
	private uiScale = 1;
	private topInset = DEFAULT_TOP_INSET;
	private view = FULL_VIEW;
	/** The canvas follows its host's size, not only the window's (the host changes with the phone layout). */
	private readonly resizeObserver: ResizeObserver;
	private readonly roundSound: RoundSound;

	private constructor(
		private readonly app: Application,
		host: HTMLElement,
		sounds: SceneSounds,
		onSeatPicked: (seat: number) => void,
	) {
		this.tweener = new Tweener(app.ticker);
		this.cards = new CardLayer(this.tweener, sounds);
		this.roundSound = new RoundSound(sounds);
		this.seats = Array.from(
			{ length: SEAT_COUNT },
			(_, index) => new SeatSprite(index, this.tweener, sounds, onSeatPicked),
		);
		this.dealerTitle.position.set(DEALER.x, DEALER.y - 112);
		this.world.addChild(
			this.felt,
			...this.seats,
			this.cards,
			// Totals, results and pointers above every card, the dealer's included.
			...this.seats.map((seat) => seat.overlay),
			this.dealerTitle,
			this.dealerLabels,
		);
		app.stage.addChild(this.world);
		app.renderer.on('resize', this.fit, this);
		this.resizeObserver = new ResizeObserver(() => app.resize());
		this.resizeObserver.observe(host);
		app.ticker.add(() => this.seats.forEach((seat) => seat.pulse(performance.now())));
		this.fit();
	}

	static async create(
		host: HTMLElement,
		sounds: SceneSounds,
		onSeatPicked: (seat: number) => void,
	): Promise<TableScene> {
		const app = new Application();
		await app.init({
			resizeTo: host,
			backgroundAlpha: 0,
			antialias: true,
			autoDensity: true,
			resolution: Math.min(devicePixelRatio, 2),
		});
		host.appendChild(app.canvas);
		return new TableScene(app, host, sounds, onSeatPicked);
	}

	/** `focusSeat` is the viewer's seat taking chips right now, highlighted like a seat in turn. */
	render(table: TableView, viewerId: number | null, focusSeat: number | null): void {
		const betting = table.phase === 'idle' || table.phase === 'betting';
		const insuring = insuranceSeat(table, viewerId);
		table.seats.forEach((seat) => {
			this.seats[seat.index]?.update(seat, {
				canSit: viewerId !== null,
				isViewer: isViewerSeat(seat, viewerId),
				activeHand: table.turn?.seat === seat.index ? table.turn.hand : null,
				showReady: betting && seat.ready,
				focused: (betting && seat.index === focusSeat) || seat.index === insuring,
			});
		});
		this.cards.sync(cardTargets(table));
		this.scheduleLabels(table, viewerId);
	}

	/** Phones keep less room above the table and crop the empty felt, so cards stay big on a short screen. */
	setFraming(framing: TableFraming): void {
		this.topInset = framing.topInset;
		this.view = framing.compact ? COMPACT_VIEW : FULL_VIEW;
		this.fit();
	}

	destroy(): void {
		this.resizeObserver.disconnect();
		clearTimeout(this.labelTimer);
		this.tweener.destroy();
		this.app.destroy(true, { children: true });
	}

	/** Totals and results appear only once the cards behind them have landed, so they never spoil a card. */
	private scheduleLabels(table: TableView, viewerId: number | null): void {
		clearTimeout(this.labelTimer);
		const insuring = insuranceSeat(table, viewerId);
		const draw = (): void => {
			table.seats.forEach((seat) => {
				const activeHand = decidingHand(table, seat, insuring);
				this.seats[seat.index]?.updateLabels(seat, activeHand, isViewerSeat(seat, viewerId));
			});
			this.drawDealerLabels(table);
			this.roundSound.play(table, viewerId);
		};
		const wait = this.cards.remainingMs;
		if (wait > 0) {
			this.labelTimer = setTimeout(draw, wait);
		} else {
			draw();
		}
	}

	private drawDealerLabels(table: TableView): void {
		this.dealerLabels.removeChildren().forEach((child) => child.destroy({ children: true }));
		if (table.dealer.total !== null) {
			const total = pill(String(table.dealer.total), table.dealer.total > 21 ? colors.red : colors.sky);
			total.position.set(DEALER.x + 70 * (table.dealer.cards.length / 2) + 70, DEALER.y);
			total.scale.set(this.uiScale);
			this.dealerLabels.addChild(total);
		}
	}

	/** Letterboxes the fixed logical stage into whatever size the canvas has. */
	private fit(): void {
		const { width } = this.app.screen;
		const height = this.app.screen.height - this.topInset;
		const viewHeight = this.view.bottom - this.view.top;
		const scale = Math.min(width / STAGE.width, height / viewHeight);
		this.world.scale.set(scale);
		this.felt.fit(width / scale / 2);
		this.uiScale = Math.min(MAX_UI_SCALE, Math.max(1, READABLE_SCALE / scale));
		this.seats.forEach((seat) => seat.setUiScale(this.uiScale));
		this.dealerTitle.scale.set(this.uiScale);
		this.dealerLabels.children.forEach((label) => label.scale.set(this.uiScale));
		this.world.position.set(
			(width - STAGE.width * scale) / 2,
			this.topInset + (height - viewHeight * scale) / 2 - this.view.top * scale,
		);
	}
}
