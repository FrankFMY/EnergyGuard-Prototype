import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { sql } from 'drizzle-orm';
import type { RequestHandler } from './$types.js';

export const GET: RequestHandler = async () => {
	const checks: Record<string, { status: 'ok' | 'error'; message?: string; latency?: number }> = {};
	let overallStatus: 'ok' | 'degraded' | 'error' = 'ok';

	// Database check with timeout
	const dbCheck = async (): Promise<number> => {
		const start = Date.now();
		await db.execute(sql`SELECT 1`);
		return Date.now() - start;
	};

	const timeout = (ms: number): Promise<never> =>
		new Promise((_, reject) => setTimeout(() => reject(new Error('Database timeout')), ms));

	try {
		const latency = await Promise.race([dbCheck(), timeout(5000)]);
		checks.database = { status: 'ok', latency };
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
