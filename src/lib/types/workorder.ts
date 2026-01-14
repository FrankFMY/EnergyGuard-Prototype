import { z } from 'zod';

export const WorkOrderStatusSchema = z.enum(['open', 'in_progress', 'completed', 'cancelled']);
export type WorkOrderStatus = z.infer<typeof WorkOrderStatusSchema>;

export const WorkOrderPrioritySchema = z.enum(['low', 'medium', 'high', 'critical']);
export type WorkOrderPriority = z.infer<typeof WorkOrderPrioritySchema>;

export const WorkOrderSchema = z.object({
	id: z.string(),
	title: z.string(),
	description: z.string(),
	engine_id: z.string().nullable(),
	status: WorkOrderStatusSchema,
	priority: WorkOrderPrioritySchema,
	assigned_to: z.string().nullable(),
	created_at: z.string(),
	due_date: z.string().nullable(),
	completed_at: z.string().nullable(),
	estimated_hours: z.number().nullable(),
	parts_required: z.array(z.string())
});
export type WorkOrder = z.infer<typeof WorkOrderSchema>;
