import type { UserRecord } from '../db/users.repo';

/** Hono context variables set by middleware. */
export interface AppEnv {
	Variables: {
		user: UserRecord;
	};
}
