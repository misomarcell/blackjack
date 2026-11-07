import { Container, Graphics, Text } from 'pixi.js';
import { drawCardBack } from './card-art';
import { CARD, RAIL, SHOE, STAGE } from './layout';
import { colors, textStyles } from './palette';

const CENTER_X = STAGE.width / 2;

function feltText(text: string, y: number, size: number): Text {
	const label = new Text({ text, style: { ...textStyles.feltTitle, fontSize: size } });
	label.anchor.set(0.5);
	label.position.set(CENTER_X, y);
	return label;
}

function drawShoe(): Container {
	const shoe = new Container();
	shoe.position.set(SHOE.x, SHOE.y);
	shoe.rotation = -0.5;
	for (let i = 0; i < 3; i++) {
		const back = drawCardBack();
		back.position.set(i * 4, -i * 4);
		shoe.addChild(back);
	}
	const box = new Graphics()
		.roundRect(-CARD.width / 2 - 14, 10, CARD.width + 36, CARD.height / 2 + 6, 14)
		.fill(colors.yellow)
		.stroke({ width: 5, color: colors.ink });
	shoe.addChild(box);
	return shoe;
}

/** The printed insurance line: a shallow arc across the middle of the felt. */
function drawInsuranceLine(): Graphics {
	const radius = 3000;
	const spread = 0.13;
	const centerY = 385 - radius;
	return new Graphics()
		.arc(CENTER_X, centerY, radius, Math.PI / 2 + spread, Math.PI / 2 - spread, true)
		.stroke({ width: 4, color: 0x9ff0cf, alpha: 0.45 });
}

/**
 * The static table: felt, rail, printed rules and the shoe. The felt reaches past the visible area so it
 * fills the whole canvas; only the player-side rail shows, as a gentle curve.
 */
export class Felt extends Container {
	private readonly table = new Graphics();

	constructor() {
		super();
		this.addChild(
			this.table,
			drawInsuranceLine(),
			feltText('BLACKJACK PAYS 3 TO 2', 315, 34),
			feltText('INSURANCE PAYS 2 TO 1', 355, 24),
			drawShoe(),
		);
		this.fit(STAGE.width / 2);
	}

	/** Redraws the rail so it rises by the same small amount at the visible edges on any screen shape. */
	fit(visibleHalfWidth: number): void {
		const radius = Math.max(STAGE.width, visibleHalfWidth ** 2 / (2 * RAIL.rise));
		const centerY = RAIL.edge - radius;
		this.table
			.clear()
			.circle(CENTER_X, centerY, radius + RAIL.width)
			.fill(colors.rail)
			.stroke({ width: 8, color: colors.ink })
			.circle(CENTER_X, centerY, radius)
			.fill(colors.felt)
			.stroke({ width: 6, color: colors.ink });
	}
}
