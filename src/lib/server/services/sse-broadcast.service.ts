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

const UPDATE_INTERVAL = 10000; // 10 seconds (increased from 5 for demo stability)
const CACHE_KEY = 'energyguard:sse:broadcast:data';

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
	// Cache for 8 seconds (slightly less than update interval)
	await cache.set(CACHE_KEY, data, 8);
	return data;
}

/**
 * Update dashboard data and notify all subscribers
 */
async function updateAndBroadcast() {
	if (isUpdating) return; // Prevent concurrent updates
	isUpdating = true;

	try {
		const data = await getCachedDashboardData();
		
		// Notify all subscribers
		subscribers.forEach((callback) => {
			try {
				callback(data);
			} catch (e) {
				console.error('[SSE Broadcast] Error notifying subscriber:', e);
			}
		});
	} catch (e) {
		console.error('[SSE Broadcast] Error updating data:', e);
	} finally {
		isUpdating = false;
	}
}

/**
 * Subscribe to dashboard data updates
 * Returns unsubscribe function
 */
export function subscribe(callback: (data: DashboardData) => void): () => void {
	subscribers.add(callback);

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
