import { json } from '@sveltejs/kit';
import { getDashboardData } from '$lib/server/services/engine.service.js';
import { getLatestEvents } from '$lib/server/services/event.service.js';
import { cache, CACHE_KEYS, CACHE_TTL } from '$lib/server/cache.js';
import type { DashboardData } from '$lib/types/api.js';

export async function GET() {
	// Use cached dashboard data
	const dashboardData = await cache.getOrSet<DashboardData>(
		CACHE_KEYS.DASHBOARD_DATA,
		getDashboardData,
		CACHE_TTL.SHORT
	);

	const events = await getLatestEvents(10);

	return json({
		engines: dashboardData.engines,
		summary: dashboardData.summary,
		events
	});
}
