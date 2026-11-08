import { Graphics } from 'pixi.js';
import { colors } from './palette';

const RADIUS = 15;

/**
 * The round check box next to a ready player's name: a green tick for a confirmed bet,
 * a grey dash for a seat sitting the round out.
 */
export function readyBadge(sittingOut: boolean): Graphics {
	const badge = new Graphics()
		.circle(0, 0, RADIUS)
		.fill(sittingOut ? colors.cream : colors.green)
		.stroke({ width: 4, color: colors.ink });
	if (sittingOut) {
		return badge.moveTo(-6, 0).lineTo(6, 0).stroke({ width: 4, color: colors.ink, cap: 'round' });
	}
	return badge
		.moveTo(-7, 0)
		.lineTo(-2, 5)
		.lineTo(7, -5)
		.stroke({ width: 4, color: colors.ink, cap: 'round', join: 'round' });
}
