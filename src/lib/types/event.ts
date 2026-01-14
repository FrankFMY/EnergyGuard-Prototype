import { z } from 'zod';

// Event level enum
export const EventLevelSchema = z.enum(['info', 'warning', 'error']);
export type EventLevel = z.infer<typeof EventLevelSchema>;

// Event log entry
export const EventSchema = z.object({
	id: z.string(),
	time: z.coerce.date(),
	level: EventLevelSchema,
	message: z.string(),
	engine_id: z.string().nullable()
});
export type Event = z.infer<typeof EventSchema>;

// Event for display (with formatted time)
export const EventDisplaySchema = EventSchema.extend({
	time: z.string()
});
export type EventDisplay = z.infer<typeof EventDisplaySchema>;

// Create event payload
export const CreateEventSchema = z.object({
	level: EventLevelSchema,
	message: z.string().min(1),
	engine_id: z.string().optional()
});
export type CreateEvent = z.infer<typeof CreateEventSchema>;
