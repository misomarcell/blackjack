const dollars = new Intl.NumberFormat('en-US', {
	style: 'currency',
	currency: 'USD',
	minimumFractionDigits: 0,
	maximumFractionDigits: 2,
});

export function formatDollars(amount: number): string {
	return dollars.format(amount);
}

/** Digital clock style ("5:07:09"), localized by Intl.DurationFormat. */
const clock = new Intl.DurationFormat(undefined, { style: 'digital', hoursDisplay: 'always' });

/**
 * A countdown such as "23:59:58". The wait is a plain span of elapsed time between two instants (no calendar
 * or time zone is involved), so it is split into hours, minutes and seconds directly.
 */
export function formatCountdown(ms: number): string {
	const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
	return clock.format({
		hours: Math.floor(totalSeconds / 3600),
		minutes: Math.floor((totalSeconds % 3600) / 60),
		seconds: totalSeconds % 60,
	});
}
