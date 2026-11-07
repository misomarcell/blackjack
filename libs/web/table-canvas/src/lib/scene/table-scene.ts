import { SEAT_COUNT, type TableView } from '@blackjack/shared/protocol';
import { Application, Container } from 'pixi.js';
import { CardLayer } from './card-layer';
import { cardTargets } from './card-targets';
import { drawFelt } from './felt';
import { DEALER, STAGE } from './layout';
import { colors } from './palette';
import { pill } from './pill';
import { SeatSprite } from './seat-sprite';
import { Tweener } from './tween';

/** CSS pixels kept free at the top for the Angular status bar, so it never covers the dealer. */
const TOP_INSET = 56;

/** The whole PixiJS table. Angular feeds it snapshots through `render`; it never talks to the server. */
export class TableScene {
	private readonly world = new Container();
	private readonly dealerLabels = new Container();
	private readonly tweener: Tweener;
	private readonly cards: CardLayer;
	private readonly seats: SeatSprite[];

	private constructor(
		private readonly app: Application,
		onSeatPicked: (seat: number) => void,
	) {
		this.tweener = new Tweener(app.ticker);
		this.cards = new CardLayer(this.tweener);
		this.seats = Array.from(
			{ length: SEAT_COUNT },
			(_, index) => new SeatSprite(index, this.tweener, onSeatPicked),
		);
		this.world.addChild(drawFelt(), ...this.seats, this.cards, this.dealerLabels);
		app.stage.addChild(this.world);
		app.renderer.on('resize', this.fit, this);
		app.ticker.add(() => this.seats.forEach((seat) => seat.pulse(performance.now())));
		this.fit();
	}

	static async create(host: HTMLElement, onSeatPicked: (seat: number) => void): Promise<TableScene> {
		const app = new Application();
		await app.init({
			resizeTo: host,
			backgroundAlpha: 0,
			antialias: true,
			autoDensity: true,
			resolution: Math.min(devicePixelRatio, 2),
		});
		host.appendChild(app.canvas);
		return new TableScene(app, onSeatPicked);
	}

	render(table: TableView, viewerId: number | null): void {
		const viewerSeated = table.seats.some((seat) => seat.player?.userId === viewerId);
		const betting = table.phase === 'idle' || table.phase === 'betting';
		table.seats.forEach((seat) => {
			this.seats[seat.index]?.update(seat, {
				viewerSeated,
				isViewer: seat.player !== null && seat.player.userId === viewerId,
				activeHand: table.turn?.seat === seat.index ? table.turn.hand : null,
				showReady: betting && seat.ready,
			});
		});
		this.cards.sync(cardTargets(table));
		this.drawDealerLabels(table);
	}

	destroy(): void {
		this.tweener.destroy();
		this.app.destroy(true, { children: true });
	}

	private drawDealerLabels(table: TableView): void {
		this.dealerLabels.removeChildren().forEach((child) => child.destroy({ children: true }));
		const title = pill('DEALER', colors.ink);
		title.position.set(DEALER.x, DEALER.y - 112);
		this.dealerLabels.addChild(title);
		if (table.dealer.total !== null) {
			const total = pill(String(table.dealer.total), table.dealer.total > 21 ? colors.red : colors.sky);
			total.position.set(DEALER.x + 70 * (table.dealer.cards.length / 2) + 70, DEALER.y);
			this.dealerLabels.addChild(total);
		}
	}

	/** Letterboxes the fixed logical stage into whatever size the canvas has. */
	private fit(): void {
		const { width } = this.app.screen;
		const height = this.app.screen.height - TOP_INSET;
		const scale = Math.min(width / STAGE.width, height / STAGE.height);
		this.world.scale.set(scale);
		this.world.position.set(
			(width - STAGE.width * scale) / 2,
			TOP_INSET + (height - STAGE.height * scale) / 2,
		);
	}
}
