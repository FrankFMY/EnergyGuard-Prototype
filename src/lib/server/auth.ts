import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from './db/index.js';
import * as schema from './db/schema.js';
import { env } from '$env/dynamic/private';

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: 'pg',
		schema: {
			user: schema.users,
			session: schema.sessions,
			account: schema.accounts,
			verification: schema.verifications
		}
	}),
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: false // Set to true in production with email provider
	},
	session: {
		expiresIn: 60 * 60 * 24 * 7, // 7 days
		updateAge: 60 * 60 * 24, // 1 day - update session if older than this
		cookieCache: {
			enabled: true,
			maxAge: 5 * 60 // 5 minutes
		}
	},
	rateLimit: {
		window: 60, // 1 minute window
		max: 100 // max 100 requests per window
	},
	trustedOrigins: env.TRUSTED_ORIGINS?.split(',') || ['http://localhost:5173'],
	user: {
		additionalFields: {
			role: {
				type: 'string',
				required: false,
				defaultValue: 'viewer',
				input: false // Don't allow users to set their own role
			}
		}
	}
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
