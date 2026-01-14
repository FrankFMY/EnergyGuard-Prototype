import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from './db/index.js';
import * as schema from './db/schema.js';
import { building } from '$app/environment';

// Type for the auth instance
type AuthInstance = ReturnType<typeof betterAuth>;

let _auth: AuthInstance | null = null;

/**
 * Get or create the Better-Auth instance
 * Uses lazy initialization to avoid issues during build
 */
function getAuth(): AuthInstance {
	if (_auth) return _auth;

	// During build, return a minimal mock
	if (building) {
		return {
			handler: () => new Response('Not available during build', { status: 503 }),
			api: {}
		} as unknown as AuthInstance;
	}

	// Get secret from environment
	const secret =
		process.env.BETTER_AUTH_SECRET ||
		process.env.AUTH_SECRET ||
		(process.env.NODE_ENV === 'production'
			? (() => {
					throw new Error('BETTER_AUTH_SECRET or AUTH_SECRET must be set in production');
				})()
			: 'dev-secret-at-least-32-characters-long');

	_auth = betterAuth({
		secret,
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
		trustedOrigins: process.env.TRUSTED_ORIGINS?.split(',') || ['http://localhost:5173'],
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

	return _auth;
}

// Export a proxy that lazily initializes auth
export const auth = new Proxy({} as AuthInstance, {
	get(_target, prop) {
		const instance = getAuth();
		const value = instance[prop as keyof AuthInstance];
		if (typeof value === 'function') {
			return value.bind(instance);
		}
		return value;
	}
});

export type Session = ReturnType<typeof betterAuth>['$Infer']['Session'];

// Base user type from better-auth
type BaseUser = ReturnType<typeof betterAuth>['$Infer']['Session']['user'];

// Extended user type with our custom role field
export type User = BaseUser & {
	role?: 'admin' | 'operator' | 'technician' | 'viewer';
};
