import type { AlertDisplay, AlertRule, AlertSeverity, AlertStatus } from '$lib/types/alert.js';

// Mock alerts data
const mockAlerts: AlertDisplay[] = [
	{
		id: 'alert-1',
		engine_id: 'gpu-2',
		severity: 'critical',
		status: 'active',
		title: 'Exhaust Temp Critical',
		message: 'Exhaust temperature exceeded 530°C threshold for more than 5 minutes',
		metric: 'temp_exhaust',
		threshold: 530,
		actual_value: 547,
		created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
		acknowledged_at: null,
		resolved_at: null,
		acknowledged_by: null
	},
	{
		id: 'alert-2',
		engine_id: 'gpu-2',
		severity: 'warning',
		status: 'acknowledged',
		title: 'Vibration Above Normal',
		message: 'Vibration level at 10.4 mm/s exceeds warning threshold of 8 mm/s',
		metric: 'vibration',
		threshold: 8,
		actual_value: 10.4,
		created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
		acknowledged_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
		resolved_at: null,
		acknowledged_by: 'Operator'
	},
	{
		id: 'alert-3',
		engine_id: 'gpu-4',
		severity: 'warning',
		status: 'resolved',
		title: 'Power Output Low',
		message: 'Power output dropped below 1000 kW threshold',
		metric: 'power_kw',
		threshold: 1000,
		actual_value: 892,
		created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
		acknowledged_at: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString(),
		resolved_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
		acknowledged_by: 'Operator'
	},
	{
		id: 'alert-4',
		engine_id: 'gpu-1',
		severity: 'info',
		status: 'resolved',
		title: 'Scheduled Maintenance Due',
		message: 'Engine GPU-1 is approaching scheduled maintenance interval',
		metric: 'total_hours',
		threshold: 2000,
		actual_value: 1950,
		created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
		acknowledged_at: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString(),
		resolved_at: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
		acknowledged_by: 'Admin'
	},
	{
		id: 'alert-5',
		engine_id: 'gpu-3',
		severity: 'critical',
		status: 'active',
		title: 'Gas Pressure Low',
		message: 'Input gas pressure below minimum operating threshold',
		metric: 'gas_pressure',
		threshold: 2.5,
		actual_value: 2.1,
		created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
		acknowledged_at: null,
		resolved_at: null,
		acknowledged_by: null
	}
];

// Mock alert rules
const mockAlertRules: AlertRule[] = [
	{
		id: 'rule-1',
		name: 'High Exhaust Temperature',
		engine_id: null,
		metric: 'temp_exhaust',
		operator: 'gt',
		threshold: 530,
		duration_seconds: 300,
		severity: 'critical',
		enabled: true,
		notify_email: true,
		notify_sms: true,
		notify_push: true
	},
	{
		id: 'rule-2',
		name: 'Vibration Warning',
		engine_id: null,
		metric: 'vibration',
		operator: 'gt',
		threshold: 8,
		duration_seconds: 60,
		severity: 'warning',
		enabled: true,
		notify_email: true,
		notify_sms: false,
		notify_push: true
	},
	{
		id: 'rule-3',
		name: 'Low Power Output',
		engine_id: null,
		metric: 'power_kw',
		operator: 'lt',
		threshold: 1000,
		duration_seconds: 120,
		severity: 'warning',
		enabled: true,
		notify_email: true,
		notify_sms: false,
		notify_push: true
	},
	{
		id: 'rule-4',
		name: 'Critical Vibration',
		engine_id: null,
		metric: 'vibration',
		operator: 'gt',
		threshold: 15,
		duration_seconds: 30,
		severity: 'critical',
		enabled: true,
		notify_email: true,
		notify_sms: true,
		notify_push: true
	}
];

export interface AlertFilters {
	severity?: AlertSeverity;
	status?: AlertStatus;
	engine_id?: string;
	hours?: number;
}

export async function getAlerts(filters?: AlertFilters): Promise<AlertDisplay[]> {
	await new Promise((r) => setTimeout(r, 300));

	let filtered = [...mockAlerts];

	if (filters?.severity) {
		filtered = filtered.filter((a) => a.severity === filters.severity);
	}
	if (filters?.status) {
		filtered = filtered.filter((a) => a.status === filters.status);
	}
	if (filters?.engine_id) {
		filtered = filtered.filter((a) => a.engine_id === filters.engine_id);
	}
	if (filters?.hours) {
		const cutoff = new Date(Date.now() - filters.hours * 60 * 60 * 1000);
		filtered = filtered.filter((a) => new Date(a.created_at) >= cutoff);
	}

	return filtered.sort(
		(a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
	);
}

export async function getAlertStats() {
	await new Promise((r) => setTimeout(r, 200));

	return {
		total: mockAlerts.length,
		active: mockAlerts.filter((a) => a.status === 'active').length,
		acknowledged: mockAlerts.filter((a) => a.status === 'acknowledged').length,
		resolved: mockAlerts.filter((a) => a.status === 'resolved').length,
		critical: mockAlerts.filter((a) => a.severity === 'critical' && a.status === 'active').length,
		warning: mockAlerts.filter((a) => a.severity === 'warning' && a.status === 'active').length
	};
}

export async function acknowledgeAlert(alertId: string): Promise<boolean> {
	await new Promise((r) => setTimeout(r, 300));
	const alert = mockAlerts.find((a) => a.id === alertId);
	if (alert && alert.status === 'active') {
		alert.status = 'acknowledged';
		alert.acknowledged_at = new Date().toISOString();
		alert.acknowledged_by = 'Operator';
		return true;
	}
	return false;
}

export async function resolveAlert(alertId: string): Promise<boolean> {
	await new Promise((r) => setTimeout(r, 300));
	const alert = mockAlerts.find((a) => a.id === alertId);
	if (alert && (alert.status === 'active' || alert.status === 'acknowledged')) {
		alert.status = 'resolved';
		alert.resolved_at = new Date().toISOString();
		if (!alert.acknowledged_at) {
			alert.acknowledged_at = new Date().toISOString();
			alert.acknowledged_by = 'Operator';
		}
		return true;
	}
	return false;
}

export async function getAlertRules(): Promise<AlertRule[]> {
	await new Promise((r) => setTimeout(r, 300));
	return [...mockAlertRules];
}

export async function toggleAlertRule(ruleId: string): Promise<boolean> {
	await new Promise((r) => setTimeout(r, 200));
	const rule = mockAlertRules.find((r) => r.id === ruleId);
	if (rule) {
		rule.enabled = !rule.enabled;
		return true;
	}
	return false;
}
