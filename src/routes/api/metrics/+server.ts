import { text } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { getMetricsOutput } from '$lib/server/metrics.js';

/**
 * Prometheus metrics endpoint
 * Returns metrics in Prometheus text format
 */
export const GET: RequestHandler = async () => {
	const metrics = getMetricsOutput();

	return text(metrics, {
		headers: {
			'Content-Type': 'text/plain; version=0.0.4; charset=utf-8'
		}
	});
};
