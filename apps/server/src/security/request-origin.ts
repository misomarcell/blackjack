import { getConnInfo } from '@hono/bun';
import type { Context } from 'hono';
import { createMiddleware } from 'hono/factory';
import { config } from '../config';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** The last value of a comma separated proxy header: the one our own proxy added. */
function lastForwarded(value: string | undefined): string | undefined {
	return value?.split(',').at(-1)?.trim() || undefined;
}

/** The caller's IP for rate limits. Behind a proxy (`TRUST_PROXY=true`) it comes from X-Forwarded-For. */
export function clientIp(c: Context): string {
	const forwarded = config.trustProxy ? lastForwarded(c.req.header('x-forwarded-for')) : undefined;
	if (forwarded) {
		return forwarded;
	}
	try {
		return getConnInfo(c).remote.address ?? 'unknown';
	} catch {
		return 'unknown';
	}
}

function hostOf(origin: string): string | null {
	try {
		return new URL(origin).host;
	} catch {
		return null;
	}
}

/** The page that sent the request was served by us (or by an origin listed in ALLOWED_ORIGINS). */
function isOwnOrigin(c: Context, origin: string): boolean {
	if (config.allowedOrigins.includes(origin)) {
		return true;
	}
	const host = hostOf(origin);
	const proxiedHost = config.trustProxy ? lastForwarded(c.req.header('x-forwarded-host')) : undefined;
	return host !== null && (host === c.req.header('host') || host === proxiedHost);
}

/**
 * Blocks cross-site request forgery and cross-site WebSocket hijacking: requests that change something, and
 * every WebSocket upgrade, must come from a page on this site. Requests without an Origin header come from
 * non-browser clients, which have no victim's cookie to abuse.
 */
export const sameOriginOnly = createMiddleware(async (c, next) => {
	const upgrade = c.req.header('upgrade')?.toLowerCase() === 'websocket';
	const origin = c.req.header('origin');
	if ((SAFE_METHODS.has(c.req.method) && !upgrade) || !origin || isOwnOrigin(c, origin)) {
		return next();
	}
	console.warn(
		`Refused ${c.req.method} ${c.req.path} from origin ${origin} (host ${c.req.header('host')}).`,
		'Behind a reverse proxy, forward the Host header or set ALLOWED_ORIGINS.',
	);
	return c.json({ error: 'Cross-site request refused' }, 403);
});
