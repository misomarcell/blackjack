import { CHIP_VALUES } from '@blackjack/shared/protocol';
import { Container, Graphics, Text } from 'pixi.js';
import { colors, textStyles } from './palette';

const MAX_CHIPS = 10;
const CHIP_RADIUS = 24;

/** Chip colors, matching the chip buttons in the Angular betting panel. */
const chipColors: Record<(typeof CHIP_VALUES)[number], number> = {
	5: colors.red,
	25: colors.green,
	100: colors.sky,
	500: 0x8b5cf6,
};

function chipsFor(amount: number): number[] {
	const chips: number[] = [];
	let rest = amount;
	for (const value of [...CHIP_VALUES].reverse()) {
		while (rest >= value && chips.length < MAX_CHIPS) {
			chips.push(value);
			rest -= value;
		}
	}
	return chips;
}

function drawChip(value: (typeof CHIP_VALUES)[number]): Graphics {
	return new Graphics()
		.circle(0, 0, CHIP_RADIUS)
		.fill(chipColors[value])
		.stroke({ width: 4, color: colors.ink })
		.circle(0, 0, CHIP_RADIUS * 0.62)
		.stroke({ width: 3, color: colors.white, alpha: 0.85 });
}

/** The value printed in the middle of the top chip, like the chip buttons. */
function chipValue(value: number): Text {
	const label = new Text({ text: String(value), style: textStyles.chip });
	label.anchor.set(0.5);
	return label;
}

/** A small stack of chips representing a bet, largest at the bottom. */
export function chipStack(amount: number): Container {
	const stack = new Container();
	const chips = chipsFor(amount);
	chips.forEach((value, index) => {
		const chip = drawChip(value as (typeof CHIP_VALUES)[number]);
		chip.y = -index * 6;
		if (index === chips.length - 1) {
			chip.addChild(chipValue(value));
		}
		stack.addChild(chip);
	});
	return stack;
}
