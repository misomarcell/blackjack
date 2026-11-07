const dollars = new Intl.NumberFormat('en-US', {
	style: 'currency',
	currency: 'USD',
	minimumFractionDigits: 0,
	maximumFractionDigits: 2,
});

export function formatDollars(amount: number): string {
	return dollars.format(amount);
}
