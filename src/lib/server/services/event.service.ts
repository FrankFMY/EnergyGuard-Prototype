import { db } from '../db/index.js';
import { events } from '../db/schema.js';
import { desc, eq, gte } from 'drizzle-orm';
import type { EventDisplay, EventLevel } from '$lib/types/index.js';

/**
 * Get latest events for the event feed
 */
export async function getLatestEvents(limit: number = 10): Promise<EventDisplay[]> {
	const result = await db.select().from(events).orderBy(desc(events.time)).limit(limit);

	return result.map((e) => ({
		id: e.id,
		time: e.time.toISOString(),
		level: e.level as EventLevel,
		message: e.message,
		engine_id: e.engine_id
	}));
}

/**
 * Get events for a specific engine
 */
export async function getEventsForEngine(
	engineId: string,
	limit: number = 20
): Promise<EventDisplay[]> {
	const result = await db
		.select()
		.from(events)
		.where(eq(events.engine_id, engineId))
		.orderBy(desc(events.time))
		.limit(limit);

	return result.map((e) => ({
		id: e.id,
		time: e.time.toISOString(),
		level: e.level as EventLevel,
		message: e.message,
		engine_id: e.engine_id
	}));
}

/**
 * Get critical events (warnings and errors) from the last N hours
 */
export async function getCriticalEvents(hours: number = 24): Promise<EventDisplay[]> {
	const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);

	const result = await db.select().from(events).where(gte(events.time, cutoffTime)).orderBy(desc(events.time));

	return result
		.filter((e) => e.level === 'warning' || e.level === 'error')
		.map((e) => ({
			id: e.id,
			time: e.time.toISOString(),
			level: e.level as EventLevel,
			message: e.message,
			engine_id: e.engine_id
		}));
}

/**
 * Count events by level for statistics
 */
export async function getEventStats(hours: number = 24) {
	const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);

	const result = await db.select().from(events).where(gte(events.time, cutoffTime));

	const stats = {
		total: result.length,
		info: 0,
		warning: 0,
		error: 0
	};

	for (const event of result) {
		if (event.level === 'info') stats.info++;
		else if (event.level === 'warning') stats.warning++;
		else if (event.level === 'error') stats.error++;
	}

	return stats;
}
