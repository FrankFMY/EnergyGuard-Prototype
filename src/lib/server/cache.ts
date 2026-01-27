import { Redis } from 'ioredis';
import { env } from '$env/dynamic/private';
import { building } from '$app/environment';

// In-memory cache fallback
const memoryCache = new Map<string, { value: string; expiry: number }>();

// Redis client (lazy initialization)
let redis: Redis | null = null;

/**
 * Get Redis client (creates one if not exists)
 */
function getRedis(): Redis | null {
	if (building) return null;

	if (!redis && env.REDIS_URL) {
		try {
			redis = new Redis(env.REDIS_URL, {
				maxRetriesPerRequest: 3,
				lazyConnect: true,
				retryStrategy(times: number) {
					if (times > 3) {
						console.warn('[EnergyGuard] Redis connection failed, falling back to memory cache');
						return null; // Stop retrying
					}
					return Math.min(times * 100, 3000);
				}
			});

			redis.on('error', (err: Error) => {
				console.warn('[EnergyGuard] Redis error:', err.message);
			});

			redis.on('connect', () => {
				console.log('[EnergyGuard] Redis connected');
			});
		} catch (err) {
			console.warn('[EnergyGuard] Failed to create Redis client:', err);
			return null;
		}
	}

	return redis;
}

/**
 * Clean expired entries from memory cache
 */
function cleanMemoryCache() {
	const now = Date.now();
	for (const [key, entry] of memoryCache.entries()) {
		if (entry.expiry < now) {
			memoryCache.delete(key);
		}
	}
}

// Clean memory cache periodically
setInterval(cleanMemoryCache, 60 * 1000);

/**
 * Cache service with Redis + memory fallback
 */
export const cache = {
	/**
	 * Get value from cache
	 */
	async get<T>(key: string): Promise<T | null> {
		const redisClient = getRedis();

		if (redisClient) {
			try {
				const value = await redisClient.get(key);
				if (value) {
					return JSON.parse(value) as T;
				}
			} catch (err) {
				console.warn('[EnergyGuard] Redis get error:', err);
			}
		}

		// Fallback to memory cache
		const entry = memoryCache.get(key);
		if (entry && entry.expiry > Date.now()) {
			return JSON.parse(entry.value) as T;
		}

		return null;
	},

	/**
	 * Set value in cache
	 * @param ttl Time to live in seconds
	 */
	async set(key: string, value: unknown, ttl = 60): Promise<void> {
		const serialized = JSON.stringify(value);
		const redisClient = getRedis();

		if (redisClient) {
			try {
				await redisClient.setex(key, ttl, serialized);
			} catch (err) {
				console.warn('[EnergyGuard] Redis set error:', err);
			}
		}

		// Always set in memory cache as fallback
		memoryCache.set(key, {
			value: serialized,
			expiry: Date.now() + ttl * 1000
		});
	},

	/**
	 * Delete value from cache
	 */
	async del(key: string): Promise<void> {
		const redisClient = getRedis();

		if (redisClient) {
			try {
				await redisClient.del(key);
			} catch (err) {
				console.warn('[EnergyGuard] Redis del error:', err);
			}
		}

		memoryCache.delete(key);
	},

	/**
	 * Delete all keys matching pattern
	 */
	async delPattern(pattern: string): Promise<void> {
		const redisClient = getRedis();

		if (redisClient) {
			try {
				const keys = await redisClient.keys(pattern);
				if (keys.length > 0) {
					await redisClient.del(...keys);
				}
			} catch (err) {
				console.warn('[EnergyGuard] Redis delPattern error:', err);
			}
		}

		// Delete from memory cache
		const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
		for (const key of memoryCache.keys()) {
			if (regex.test(key)) {
				memoryCache.delete(key);
			}
		}
	},

	/**
	 * Get or set value (cache-aside pattern)
	 */
	async getOrSet<T>(key: string, factory: () => Promise<T>, ttl = 60): Promise<T> {
		const cached = await this.get<T>(key);
		if (cached !== null) {
			return cached;
		}

		const value = await factory();
		await this.set(key, value, ttl);
		return value;
	}
};

// Cache keys
export const CACHE_KEYS = {
	DASHBOARD_DATA: 'energyguard:dashboard:data',
	ENGINES_LIST: 'energyguard:engines:list',
	ENGINES_WITH_METRICS: 'energyguard:engines:metrics',
	MAINTENANCE_FORECASTS: 'energyguard:maintenance:forecasts',
	EVENTS_LATEST: (limit: number) => `energyguard:events:latest:${limit}`,
	ALERTS_ACTIVE: 'energyguard:alerts:active',
	ALERTS_STATS: 'energyguard:alerts:stats',
	ENGINE_DETAIL: (id: string) => `energyguard:engine:${id}`,
	ENGINE_TELEMETRY: (id: string) => `energyguard:engine:${id}:telemetry`
} as const;

// Default TTLs (in seconds)
export const CACHE_TTL = {
	SHORT: 2, // 2 seconds for real-time data
	MEDIUM: 30, // 30 seconds for dashboard
	LONG: 300, // 5 minutes for static data
	HOUR: 3600 // 1 hour
} as const;
