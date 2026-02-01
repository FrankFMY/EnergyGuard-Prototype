/**
 * Shared data source for SSE connections
 * Prevents multiple concurrent database queries when many users are connected
 * All SSE clients receive the same cached data
 */
import { getDashboardData } from './engine.service.js';
import { cache } from '../cache.js';
import type { DashboardData } from '$lib/types/api.js';

const subscribers: Set<(data: DashboardData) => void> = new Set();
let updateInterval: ReturnType<typeof setInterval> | null = null;
let isUpdating = false;
let updatePromise: Promise<void> | null = null;

const UPDATE_INTERVAL = 10000; // 10 seconds (increased from 5 for demo stability)
const CACHE_KEY = 'energyguard:sse:broadcast:data';
const CACHE_TTL = 10; // Match UPDATE_INTERVAL to avoid gaps

// Connection limits to prevent memory issues
const MAX_SUBSCRIBERS = 100; // Max concurrent SSE connections for demo
const SUBSCRIBER_TIMEOUT = 30000; // 30 seconds timeout for slow subscribers

/**
 * Get cached dashboard data or fetch fresh
 */
async function getCachedDashboardData(): Promise<DashboardData> {
	// Try cache first
	const cached = await cache.get<DashboardData>(CACHE_KEY);
	if (cached) {
		return cached;
	}

	// Fetch fresh data
	const data = await getDashboardData();
	// Cache for same duration as update interval
	await cache.set(CACHE_KEY, data, CACHE_TTL);
	return data;
}

/**
 * Update dashboard data and notify all subscribers
 * Uses a promise lock to prevent race conditions
 */
async function updateAndBroadcast() {
	// Use promise-based locking instead of simple flag
	if (updatePromise) {
		return updatePromise;
	}

	updatePromise = (async () => {
		try {
			const data = await getCachedDashboardData();

			// Create a copy of subscribers to iterate safely
			const currentSubscribers = Array.from(subscribers);

			// Notify all subscribers with timeout protection
			const notifications = currentSubscribers.map((callback) => {
				return new Promise<void>((resolve) => {
					const timeout = setTimeout(() => {
						console.warn('[SSE Broadcast] Subscriber timeout, removing slow subscriber');
						subscribers.delete(callback);
						resolve();
					}, SUBSCRIBER_TIMEOUT);

					try {
						callback(data);
						clearTimeout(timeout);
						resolve();
					} catch (e) {
						clearTimeout(timeout);
						console.error('[SSE Broadcast] Error notifying subscriber:', e);
						// Remove broken subscribers
						subscribers.delete(callback);
						resolve();
					}
				});
			});

			await Promise.all(notifications);
		} catch (e) {
			console.error('[SSE Broadcast] Error updating data:', e);
		} finally {
			updatePromise = null;
		}
	})();

	return updatePromise;
}

/**
 * Subscribe to dashboard data updates
 * Returns unsubscribe function
 * Returns null if max subscribers reached
 */
export function subscribe(callback: (data: DashboardData) => void): (() => void) | null {
	// Check connection limit
	if (subscribers.size >= MAX_SUBSCRIBERS) {
		console.warn(`[SSE Broadcast] Max subscribers (${MAX_SUBSCRIBERS}) reached, rejecting new connection`);
		return null;
	}

	// Prevent duplicate subscriptions
	if (subscribers.has(callback)) {
		console.warn('[SSE Broadcast] Duplicate subscription detected, ignoring');
		return () => {
			subscribers.delete(callback);
		};
	}

	subscribers.add(callback);
	console.log(`[SSE Broadcast] New subscriber. Total: ${subscribers.size}`);

	// Start update interval if this is the first subscriber
	if (subscribers.size === 1 && !updateInterval) {
		// Initial update
		updateAndBroadcast();

		// Start periodic updates
		updateInterval = setInterval(updateAndBroadcast, UPDATE_INTERVAL);
	}

	// Return unsubscribe function
	return () => {
		subscribers.delete(callback);
		console.log(`[SSE Broadcast] Subscriber removed. Total: ${subscribers.size}`);

		// Stop update interval if no more subscribers
		if (subscribers.size === 0 && updateInterval) {
			clearInterval(updateInterval);
			updateInterval = null;
		}
	};
}

/**
 * Get current dashboard data (for initial connection)
 */
export async function getCurrentData(): Promise<DashboardData> {
	return getCachedDashboardData();
}

/**
 * Get current subscriber count (for monitoring)
 */
export function getSubscriberCount(): number {
	return subscribers.size;
}

/**
 * Check if new connections are allowed
 */
export function canAcceptConnection(): boolean {
	return subscribers.size < MAX_SUBSCRIBERS;
}
