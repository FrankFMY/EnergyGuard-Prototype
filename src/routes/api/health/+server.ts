import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { sql } from 'drizzle-orm';
import type { RequestHandler } from './$types.js';

export const GET: RequestHandler = async () => {
	const checks: Record<string, { status: 'ok' | 'error'; message?: string; latency?: number }> = {};
	let overallStatus: 'ok' | 'degraded' | 'error' = 'ok';

	// Database check
	const dbStart = Date.now();
	try {
		await db.execute(sql`SELECT 1`);
		checks.database = { status: 'ok', latency: Date.now() - dbStart };
	} catch (error) {
		checks.database = {
			status: 'error',
			message: error instanceof Error ? error.message : 'Unknown error'
		};
		overallStatus = 'error';
	}

	// Return health status
	const httpStatus = overallStatus === 'error' ? 503 : 200;
	return json(
		{
			status: overallStatus,
			timestamp: new Date().toISOString(),
			version: '0.0.1',
			checks
		},
		{ status: httpStatus }
	);
};
