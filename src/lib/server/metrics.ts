/**
 * Simple Prometheus-compatible metrics collector
 * Provides basic application metrics for monitoring
 */

interface Counter {
	inc(labels?: Record<string, string>, value?: number): void;
	get(labels?: Record<string, string>): number;
}

interface Gauge {
	set(value: number, labels?: Record<string, string>): void;
	inc(labels?: Record<string, string>, value?: number): void;
	dec(labels?: Record<string, string>, value?: number): void;
	get(labels?: Record<string, string>): number;
}

interface Histogram {
	observe(value: number, labels?: Record<string, string>): void;
	get(labels?: Record<string, string>): {
		count: number;
		sum: number;
		buckets: Map<number, number>;
	};
}

// Storage for metrics
const counters = new Map<string, Map<string, number>>();
const gauges = new Map<string, Map<string, number>>();
const histograms = new Map<
	string,
	Map<string, { count: number; sum: number; buckets: Map<number, number> }>
>();

function labelsToKey(labels?: Record<string, string>): string {
	if (!labels || Object.keys(labels).length === 0) return '';
	return Object.entries(labels)
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([k, v]) => `${k}="${v}"`)
		.join(',');
}

function createCounter(name: string, _help: string): Counter {
	if (!counters.has(name)) {
		counters.set(name, new Map());
	}
	const storage = counters.get(name)!;

	return {
		inc(labels?: Record<string, string>, value = 1) {
			const key = labelsToKey(labels);
			storage.set(key, (storage.get(key) ?? 0) + value);
		},
		get(labels?: Record<string, string>) {
			const key = labelsToKey(labels);
			return storage.get(key) ?? 0;
		}
	};
}

function createGauge(name: string, _help: string): Gauge {
	if (!gauges.has(name)) {
		gauges.set(name, new Map());
	}
	const storage = gauges.get(name)!;

	return {
		set(value: number, labels?: Record<string, string>) {
			const key = labelsToKey(labels);
			storage.set(key, value);
		},
		inc(labels?: Record<string, string>, value = 1) {
			const key = labelsToKey(labels);
			storage.set(key, (storage.get(key) ?? 0) + value);
		},
		dec(labels?: Record<string, string>, value = 1) {
			const key = labelsToKey(labels);
			storage.set(key, (storage.get(key) ?? 0) - value);
		},
		get(labels?: Record<string, string>) {
			const key = labelsToKey(labels);
			return storage.get(key) ?? 0;
		}
	};
}

function createHistogram(name: string, _help: string, buckets: number[]): Histogram {
	if (!histograms.has(name)) {
		histograms.set(name, new Map());
	}
	const storage = histograms.get(name)!;

	return {
		observe(value: number, labels?: Record<string, string>) {
			const key = labelsToKey(labels);
			if (!storage.has(key)) {
				storage.set(key, {
					count: 0,
					sum: 0,
					buckets: new Map(buckets.map((b) => [b, 0]))
				});
			}
			const data = storage.get(key)!;
			data.count++;
			data.sum += value;
			for (const bucket of buckets) {
				if (value <= bucket) {
					data.buckets.set(bucket, (data.buckets.get(bucket) ?? 0) + 1);
				}
			}
		},
		get(labels?: Record<string, string>) {
			const key = labelsToKey(labels);
			return storage.get(key) ?? { count: 0, sum: 0, buckets: new Map() };
		}
	};
}

// ==================== APPLICATION METRICS ====================

// HTTP metrics
export const httpRequestsTotal = createCounter(
	'kastor_http_requests_total',
	'Total number of HTTP requests'
);

export const httpRequestDuration = createHistogram(
	'kastor_http_request_duration_seconds',
	'HTTP request duration in seconds',
	[0.01, 0.05, 0.1, 0.5, 1, 5]
);

// SSE metrics
export const sseConnectionsActive = createGauge(
	'kastor_sse_connections_active',
	'Number of active SSE connections'
);

export const sseMessagesTotal = createCounter(
	'kastor_sse_messages_total',
	'Total number of SSE messages sent'
);

// MQTT metrics
export const mqttMessagesTotal = createCounter(
	'kastor_mqtt_messages_total',
	'Total number of MQTT messages received'
);

export const mqttConnectionStatus = createGauge(
	'kastor_mqtt_connection_status',
	'MQTT connection status (1 = connected, 0 = disconnected)'
);

// Database metrics
export const dbQueryDuration = createHistogram(
	'kastor_db_query_duration_seconds',
	'Database query duration in seconds',
	[0.001, 0.01, 0.1, 0.5, 1]
);

// Cache metrics
export const cacheHitsTotal = createCounter(
	'kastor_cache_hits_total',
	'Total number of cache hits'
);

export const cacheMissesTotal = createCounter(
	'kastor_cache_misses_total',
	'Total number of cache misses'
);

// Engine metrics
export const enginesTotalCount = createGauge('kastor_engines_total', 'Total number of engines');

export const enginesOnlineCount = createGauge('kastor_engines_online', 'Number of online engines');

// Alert metrics
export const alertsActiveCount = createGauge('kastor_alerts_active', 'Number of active alerts');

export const alertsCreatedTotal = createCounter(
	'kastor_alerts_created_total',
	'Total number of alerts created'
);

/**
 * Generate Prometheus-compatible metrics output
 */
export function getMetricsOutput(): string {
	const lines: string[] = [];

	// Counters
	for (const [name, storage] of counters) {
		lines.push(`# TYPE ${name} counter`);
		for (const [labels, value] of storage) {
			const labelStr = labels ? `{${labels}}` : '';
			lines.push(`${name}${labelStr} ${value}`);
		}
	}

	// Gauges
	for (const [name, storage] of gauges) {
		lines.push(`# TYPE ${name} gauge`);
		for (const [labels, value] of storage) {
			const labelStr = labels ? `{${labels}}` : '';
			lines.push(`${name}${labelStr} ${value}`);
		}
	}

	// Histograms
	for (const [name, storage] of histograms) {
		lines.push(`# TYPE ${name} histogram`);
		for (const [labels, data] of storage) {
			const labelStr = labels ? `,${labels}` : '';
			for (const [bucket, count] of data.buckets) {
				lines.push(`${name}_bucket{le="${bucket}"${labelStr}} ${count}`);
			}
			lines.push(`${name}_bucket{le="+Inf"${labelStr}} ${data.count}`);
			lines.push(`${name}_sum{${labels || ''}} ${data.sum}`);
			lines.push(`${name}_count{${labels || ''}} ${data.count}`);
		}
	}

	return lines.join('\n');
}

/**
 * Reset all metrics (useful for testing)
 */
export function resetMetrics(): void {
	counters.clear();
	gauges.clear();
	histograms.clear();
}
