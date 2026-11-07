import { Container, Graphics, Text } from 'pixi.js';
import { colors, textStyles } from './palette';

/** A chunky rounded label, centered on its position. */
export function pill(text: string, fill: number, textColor: number = colors.white): Container {
	const label = new Text({ text, style: { ...textStyles.pill, fill: textColor } });
	label.anchor.set(0.5);
	const width = label.width + 26;
	const height = label.height + 8;
	const background = new Graphics()
		.roundRect(-width / 2, -height / 2, width, height, height / 2)
		.fill(fill)
		.stroke({ width: 4, color: colors.ink });
	const container = new Container();
	container.addChild(background, label);
	return container;
}
