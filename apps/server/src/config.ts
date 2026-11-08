import { z } from 'zod';

const seconds = (fallback: number) =>
	z.coerce
		.number()
		.positive()
		.default(fallback)
		.transform((value) => value * 1000);

const envSchema = z.object({
	NODE_ENV: z.string().default('development'),
	PORT: z.coerce.number().int().default(3000),
	DATABASE_URL: z.string().default('mysql://blackjack:blackjack@localhost:3306/blackjack'),
	/** MySQL 8 auth over a plain connection. Safe on a private Docker network; disable when using TLS. */
	DATABASE_ALLOW_PUBLIC_KEY_RETRIEVAL: z.stringbool().default(true),
	JWT_SECRET: z.string().min(16).default('dev-only-secret-change-me'),
	ADMIN_USERNAME: z.string().default('admin'),
	STARTING_BALANCE: z.coerce.number().positive().default(1000),
	COOKIE_SECURE: z.stringbool().default(false),
	STATIC_DIR: z.string().default('dist/apps/web/browser'),
	FIRST_BET_SECONDS: seconds(10),
	BETTING_SECONDS: seconds(45),
	INSURANCE_SECONDS: seconds(10),
	TURN_SECONDS: seconds(20),
	DEALER_HITS_SOFT_17: z.stringbool().default(false),
	DECKS: z.coerce.number().int().min(1).max(8).default(6),
	REFILL_COOLDOWN_HOURS: z.coerce.number().positive().default(24),
});

const env = envSchema.parse(Bun.env);

if (env.NODE_ENV === 'production' && env.JWT_SECRET.startsWith('dev-only')) {
	throw new Error('JWT_SECRET must be set in production');
}

export const config = {
	port: env.PORT,
	databaseUrl: env.DATABASE_URL,
	databaseAllowPublicKeyRetrieval: env.DATABASE_ALLOW_PUBLIC_KEY_RETRIEVAL,
	jwtSecret: env.JWT_SECRET,
	adminUsername: env.ADMIN_USERNAME,
	startingBalance: env.STARTING_BALANCE,
	/** Hours between two free refills. */
	refillCooldownHours: env.REFILL_COOLDOWN_HOURS,
	cookieSecure: env.COOKIE_SECURE,
	staticDir: env.STATIC_DIR,
};

/** Timing and house rules for every table. */
export const gameConfig = {
	firstBetMs: env.FIRST_BET_SECONDS,
	bettingMs: env.BETTING_SECONDS,
	insuranceMs: env.INSURANCE_SECONDS,
	turnMs: env.TURN_SECONDS,
	/** Time per card the clients need to play the deal animation. */
	dealMs: 450,
	/** How long results stay on the table before the next betting round. */
	resultsMs: 2500,
	hitSoft17: env.DEALER_HITS_SOFT_17,
	decks: env.DECKS,
};

export type GameConfig = typeof gameConfig;
