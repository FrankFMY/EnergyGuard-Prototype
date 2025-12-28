import { z } from 'zod';

// Alert severity levels
export const AlertSeveritySchema = z.enum(['info', 'warning', 'critical']);
export type AlertSeverity = z.infer<typeof AlertSeveritySchema>;

// Alert status
export const AlertStatusSchema = z.enum(['active', 'acknowledged', 'resolved']);
export type AlertStatus = z.infer<typeof AlertStatusSchema>;

// Alert type
export const AlertSchema = z.object({
	id: z.string(),
	engine_id: z.string().nullable(),
	severity: AlertSeveritySchema,
	status: AlertStatusSchema,
	title: z.string(),
	message: z.string(),
	metric: z.string().nullable(),
	threshold: z.number().nullable(),
	actual_value: z.number().nullable(),
	created_at: z.coerce.date(),
	acknowledged_at: z.coerce.date().nullable(),
	resolved_at: z.coerce.date().nullable(),
	acknowledged_by: z.string().nullable()
});
export type Alert = z.infer<typeof AlertSchema>;

// Alert for display
export const AlertDisplaySchema = AlertSchema.extend({
	created_at: z.string(),
	acknowledged_at: z.string().nullable(),
	resolved_at: z.string().nullable()
});
export type AlertDisplay = z.infer<typeof AlertDisplaySchema>;

// Alert rule for configuration
export const AlertRuleSchema = z.object({
	id: z.string(),
	name: z.string(),
	engine_id: z.string().nullable(), // null = applies to all
	metric: z.string(),
	operator: z.enum(['gt', 'lt', 'gte', 'lte', 'eq']),
	threshold: z.number(),
	duration_seconds: z.number(), // How long condition must persist
	severity: AlertSeveritySchema,
	enabled: z.boolean(),
	notify_email: z.boolean(),
	notify_sms: z.boolean(),
	notify_push: z.boolean()
});
export type AlertRule = z.infer<typeof AlertRuleSchema>;
