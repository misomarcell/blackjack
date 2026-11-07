import { Container, Graphics, Text } from 'pixi.js';
import { drawCardBack } from './card-art';
import { CARD, SHOE, STAGE } from './layout';
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

/** The static table: rail, felt, printed rules and the shoe. */
export function drawFelt(): Container {
	const felt = new Container();
	const table = new Graphics()
		.ellipse(CENTER_X, 40, 790, 840)
		.fill(colors.rail)
		.stroke({ width: 8, color: colors.ink })
		.ellipse(CENTER_X, 40, 745, 795)
		.fill(colors.felt)
		.stroke({ width: 6, color: colors.ink })
		.ellipse(CENTER_X, 40, 420, 360)
		.stroke({ width: 4, color: 0x9ff0cf, alpha: 0.45 });
	felt.addChild(
		table,
		feltText('BLACKJACK PAYS 3 TO 2', 330, 34),
		feltText('INSURANCE PAYS 2 TO 1', 372, 24),
		drawShoe(),
	);
	return felt;
}
