import { SEAT_COUNT, type SeatView, type TableView } from '@blackjack/shared/protocol';
import { Application, Container } from 'pixi.js';
import { CardLayer } from './card-layer';
import { cardTargets } from './card-targets';
import { Felt } from './felt';
import { DEALER, STAGE } from './layout';
import { colors } from './palette';
import { pill } from './pill';
import { SeatSprite } from './seat-sprite';
import type { SceneSounds } from './sounds';
import { Tweener } from './tween';

/** CSS pixels kept free at the top for the Angular status bar, so it never covers the dealer. */
const TOP_INSET = 56;
/** Seats and labels grow up to this much on small screens, so they stay readable on a phone. */
const MAX_UI_SCALE = 1.7;
/** The on-screen size (world scale) below which seats start to grow. */
const READABLE_SCALE = 0.55;

function isViewerSeat(seat: SeatView, viewerId: number | null): boolean {
	return seat.player !== null && seat.player.userId === viewerId;
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

	private constructor(
		private readonly app: Application,
		sounds: SceneSounds,
		onSeatPicked: (seat: number) => void,
	) {
		this.tweener = new Tweener(app.ticker);
		this.cards = new CardLayer(this.tweener, sounds);
		this.seats = Array.from(
			{ length: SEAT_COUNT },
			(_, index) => new SeatSprite(index, this.tweener, sounds, onSeatPicked),
		);
		this.dealerTitle.position.set(DEALER.x, DEALER.y - 112);
		this.world.addChild(this.felt, ...this.seats, this.cards, this.dealerTitle, this.dealerLabels);
		app.stage.addChild(this.world);
		app.renderer.on('resize', this.fit, this);
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
		return new TableScene(app, sounds, onSeatPicked);
	}

	render(table: TableView, viewerId: number | null): void {
		const viewerSeated = table.seats.some((seat) => seat.player?.userId === viewerId);
		const betting = table.phase === 'idle' || table.phase === 'betting';
		table.seats.forEach((seat) => {
			this.seats[seat.index]?.update(seat, {
				viewerSeated,
				isViewer: isViewerSeat(seat, viewerId),
				activeHand: table.turn?.seat === seat.index ? table.turn.hand : null,
				showReady: betting && seat.ready,
			});
		});
		this.cards.sync(cardTargets(table));
		this.scheduleLabels(table, viewerId);
	}

	destroy(): void {
		clearTimeout(this.labelTimer);
		this.tweener.destroy();
		this.app.destroy(true, { children: true });
	}

	/** Totals and results appear only once the cards behind them have landed, so they never spoil a card. */
	private scheduleLabels(table: TableView, viewerId: number | null): void {
		clearTimeout(this.labelTimer);
		const draw = (): void => {
			table.seats.forEach((seat) => {
				const activeHand = table.turn?.seat === seat.index ? table.turn.hand : null;
				this.seats[seat.index]?.updateLabels(seat, activeHand, isViewerSeat(seat, viewerId));
			});
			this.drawDealerLabels(table);
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
		const height = this.app.screen.height - TOP_INSET;
		const scale = Math.min(width / STAGE.width, height / STAGE.height);
		this.world.scale.set(scale);
		this.felt.fit(width / scale / 2);
		this.uiScale = Math.min(MAX_UI_SCALE, Math.max(1, READABLE_SCALE / scale));
		this.seats.forEach((seat) => seat.setUiScale(this.uiScale));
		this.dealerTitle.scale.set(this.uiScale);
		this.dealerLabels.children.forEach((label) => label.scale.set(this.uiScale));
		this.world.position.set(
			(width - STAGE.width * scale) / 2,
			TOP_INSET + (height - STAGE.height * scale) / 2,
		);
	}
}
