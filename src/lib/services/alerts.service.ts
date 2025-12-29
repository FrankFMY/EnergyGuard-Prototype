import type { AlertDisplay, AlertRule, AlertSeverity, AlertStatus } from '$lib/types/alert.js';

export interface AlertFilters {
	severity?: AlertSeverity;
	status?: AlertStatus;
	engine_id?: string;
	hours?: number;
}

/**
 * Fetch alerts from API with optional filters
 */
export async function getAlerts(filters?: AlertFilters): Promise<AlertDisplay[]> {
	const params = new URLSearchParams();
	if (filters?.severity) params.set('severity', filters.severity);
	if (filters?.status) params.set('status', filters.status);
	if (filters?.engine_id) params.set('engine_id', filters.engine_id);
	if (filters?.hours) params.set('hours', String(filters.hours));

	const response = await fetch(`/api/alerts?${params.toString()}`);
	if (!response.ok) {
		throw new Error(`Failed to fetch alerts: ${response.statusText}`);
	}
	return response.json();
}

/**
 * Get alert statistics
 */
export async function getAlertStats() {
	const response = await fetch('/api/alerts/stats');
	if (!response.ok) {
		throw new Error(`Failed to fetch alert stats: ${response.statusText}`);
	}
	return response.json();
}

/**
 * Acknowledge an alert
 */
export async function acknowledgeAlert(alertId: string): Promise<boolean> {
	const response = await fetch(`/api/alerts/${alertId}`, {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ status: 'acknowledged' })
	});
	return response.ok;
}

/**
 * Resolve an alert
 */
export async function resolveAlert(alertId: string): Promise<boolean> {
	const response = await fetch(`/api/alerts/${alertId}`, {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ status: 'resolved' })
	});
	return response.ok;
}

/**
 * Fetch alert rules
 */
export async function getAlertRules(): Promise<AlertRule[]> {
	const response = await fetch('/api/alerts/rules');
	if (!response.ok) {
		throw new Error(`Failed to fetch alert rules: ${response.statusText}`);
	}
	return response.json();
}

/**
 * Toggle alert rule enabled state
 */
export async function toggleAlertRule(ruleId: string): Promise<boolean> {
	const response = await fetch(`/api/alerts/rules/${ruleId}/toggle`, {
		method: 'PATCH'
	});
	return response.ok;
}

export interface CreateAlertRuleInput {
	name: string;
	engine_id: string | null;
	metric: string;
	operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq';
	threshold: number;
	duration_seconds: number;
	severity: AlertSeverity;
	notify_email: boolean;
	notify_sms: boolean;
	notify_push: boolean;
}

/**
 * Create a new alert rule
 */
export async function createAlertRule(input: CreateAlertRuleInput): Promise<AlertRule> {
	const response = await fetch('/api/alerts/rules', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(input)
	});
	if (!response.ok) {
		throw new Error(`Failed to create alert rule: ${response.statusText}`);
	}
	return response.json();
}
