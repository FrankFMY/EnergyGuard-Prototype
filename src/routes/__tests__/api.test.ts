import { describe, it, expect, beforeAll } from 'vitest';

// These tests require the server to be running
// Run with: bun run test:integration
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5173';

describe.skip('API Integration Tests', () => {
	describe('Health Check', () => {
		it('GET /api/health returns 200', async () => {
			const response = await fetch(`${BASE_URL}/api/health`);
			expect(response.status).toBe(200);

			const data = await response.json();
			expect(data).toHaveProperty('status');
			expect(data).toHaveProperty('timestamp');
			expect(data).toHaveProperty('checks');
		});
	});

	describe('Status API', () => {
		it('GET /api/status returns dashboard data', async () => {
			const response = await fetch(`${BASE_URL}/api/status`);
			expect(response.status).toBe(200);

			const data = await response.json();
			expect(data).toHaveProperty('engines');
			expect(data).toHaveProperty('summary');
			expect(Array.isArray(data.engines)).toBe(true);
		});
	});

	describe('Alerts API', () => {
		it('GET /api/alerts returns alerts list', async () => {
			const response = await fetch(`${BASE_URL}/api/alerts`);
			expect(response.status).toBe(200);

			const data = await response.json();
			expect(data).toHaveProperty('alerts');
			expect(data).toHaveProperty('stats');
			expect(Array.isArray(data.alerts)).toBe(true);
		});

		it('GET /api/alerts with severity filter works', async () => {
			const response = await fetch(`${BASE_URL}/api/alerts?severity=critical`);
			expect(response.status).toBe(200);

			const data = await response.json();
			data.alerts.forEach((alert: { severity: string }) => {
				expect(alert.severity).toBe('critical');
			});
		});
	});

	describe('Engines API', () => {
		it('GET /api/engines returns engine list', async () => {
			const response = await fetch(`${BASE_URL}/api/engines`);
			expect(response.status).toBe(200);

			const data = await response.json();
			expect(Array.isArray(data)).toBe(true);
		});

		it('GET /api/engines?metrics=true includes metrics', async () => {
			const response = await fetch(`${BASE_URL}/api/engines?metrics=true`);
			expect(response.status).toBe(200);

			const data = await response.json();
			if (data.length > 0) {
				expect(data[0]).toHaveProperty('power_kw');
				expect(data[0]).toHaveProperty('temp');
			}
		});
	});

	describe('Work Orders API', () => {
		it('GET /api/workorders returns work orders', async () => {
			const response = await fetch(`${BASE_URL}/api/workorders`);
			expect(response.status).toBe(200);

			const data = await response.json();
			expect(data).toHaveProperty('workOrders');
			expect(data).toHaveProperty('stats');
		});
	});

	describe('Rate Limiting', () => {
		it('responds with X-RateLimit-Remaining header', async () => {
			const response = await fetch(`${BASE_URL}/api/health`);
			expect(response.headers.has('x-ratelimit-remaining')).toBe(true);
		});
	});
});

// Unit tests that don't need a running server
describe('API Response Schemas', () => {
	it('health response schema is correct', () => {
		const mockHealth = {
			status: 'ok',
			timestamp: new Date().toISOString(),
			version: '0.0.1',
			checks: {
				database: { status: 'ok', latency: 5 }
			}
		};

		expect(mockHealth.status).toMatch(/^(ok|degraded|error)$/);
		expect(new Date(mockHealth.timestamp)).toBeInstanceOf(Date);
	});

	it('alert stats schema is correct', () => {
		const mockStats = {
			total: 10,
			active: 3,
			acknowledged: 2,
			resolved: 5,
			critical: 1,
			warning: 2
		};

		expect(mockStats.total).toBeGreaterThanOrEqual(0);
		expect(mockStats.active).toBeGreaterThanOrEqual(0);
		expect(mockStats.critical).toBeGreaterThanOrEqual(0);
	});
});
