const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

/** Animates a number from `from` to `to` and returns a cancel function. Jumps straight there for reduced motion. */
export function countUp(
	from: number,
	to: number,
	durationMs: number,
	onFrame: (value: number) => void,
): () => void {
	if (matchMedia('(prefers-reduced-motion: reduce)').matches || from === to) {
		onFrame(to);
		return () => undefined;
	}
	const start = performance.now();
	let frame = requestAnimationFrame(function step(now: number) {
		const progress = Math.min(1, (now - start) / durationMs);
		onFrame(from + (to - from) * easeOutCubic(progress));
		if (progress < 1) {
			frame = requestAnimationFrame(step);
		}
	});
	return () => cancelAnimationFrame(frame);
}
