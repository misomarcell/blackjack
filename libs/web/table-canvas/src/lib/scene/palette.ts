import { TextStyle } from 'pixi.js';

/** Colors and text styles of the table. Kept in sync with the arcade theme in apps/web/src/styles/theme.css. */
export const colors = {
	ink: 0x262047,
	felt: 0x1fa37a,
	feltDark: 0x137a5b,
	rail: 0xdf6100,
	railDark: 0xb03f00,
	cream: 0xfff8e6,
	yellow: 0xffd23f,
	sky: 0x2bb6f5,
	red: 0xe5304b,
	green: 0x3ddc84,
	white: 0xffffff,
};

const display = 'Lilita One, system-ui, sans-serif';

export const textStyles = {
	label: new TextStyle({
		fontFamily: display,
		fontSize: 26,
		fill: colors.white,
		stroke: { color: colors.ink, width: 6 },
	}),
	small: new TextStyle({ fontFamily: display, fontSize: 20, fill: colors.ink }),
	pill: new TextStyle({ fontFamily: display, fontSize: 22, fill: colors.white }),
	chip: new TextStyle({
		fontFamily: display,
		fontSize: 17,
		fill: colors.white,
		stroke: { color: colors.ink, width: 4 },
	}),
	rank: new TextStyle({ fontFamily: display, fontSize: 30, fill: colors.ink }),
	feltTitle: new TextStyle({
		fontFamily: display,
		fontSize: 34,
		fill: 0x9ff0cf,
		letterSpacing: 4,
	}),
};
