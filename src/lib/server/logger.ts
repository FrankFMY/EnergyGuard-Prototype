import { env } from '$env/dynamic/private';
import { building } from '$app/environment';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
	timestamp: string;
	level: LogLevel;
	message: string;
	context?: string;
	data?: Record<string, unknown>;
	error?: {
		name: string;
		message: string;
		stack?: string;
	};
	requestId?: string;
	userId?: string;
	duration?: number;
}

const LOG_LEVELS: Record<LogLevel, number> = {
	debug: 0,
	info: 1,
	warn: 2,
	error: 3
};

function getMinLevel(): LogLevel {
	const level = env.LOG_LEVEL?.toLowerCase() as LogLevel | undefined;
	return level && level in LOG_LEVELS ? level : 'info';
}

function shouldLog(level: LogLevel): boolean {
	if (building) return false;
	return LOG_LEVELS[level] >= LOG_LEVELS[getMinLevel()];
}

function formatForConsole(entry: LogEntry): string {
	const timestamp = entry.timestamp.substring(11, 23); // HH:mm:ss.SSS
	const level = entry.level.toUpperCase().padEnd(5);
	const context = entry.context ? `[${entry.context}]` : '';

	let msg = `${timestamp} ${level} ${context} ${entry.message}`;

	if (entry.data && Object.keys(entry.data).length > 0) {
		msg += ` ${JSON.stringify(entry.data)}`;
	}

	if (entry.error) {
		msg += `\n  Error: ${entry.error.message}`;
		if (entry.error.stack && env.NODE_ENV !== 'production') {
			msg += `\n${entry.error.stack}`;
		}
	}

	return msg;
}

function log(
	level: LogLevel,
	message: string,
	options?: {
		context?: string;
		data?: Record<string, unknown>;
		error?: Error;
		requestId?: string;
		userId?: string;
		duration?: number;
	}
): void {
	if (!shouldLog(level)) return;

	const entry: LogEntry = {
		timestamp: new Date().toISOString(),
		level,
		message,
		context: options?.context,
		data: options?.data,
		requestId: options?.requestId,
		userId: options?.userId,
		duration: options?.duration
	};

	if (options?.error) {
		entry.error = {
			name: options.error.name,
			message: options.error.message,
			stack: options.error.stack
		};
	}

	// In production, output JSON for log aggregation
	if (env.NODE_ENV === 'production') {
		console.log(JSON.stringify(entry));
	} else {
		// In development, use formatted output
		const formatted = formatForConsole(entry);
		switch (level) {
			case 'error':
				console.error(formatted);
				break;
			case 'warn':
				console.warn(formatted);
				break;
			default:
				console.log(formatted);
		}
	}
}

/**
 * Structured logger for KASTOR IoT
 */
export const logger = {
	debug: (message: string, options?: Parameters<typeof log>[2]) => log('debug', message, options),

	info: (message: string, options?: Parameters<typeof log>[2]) => log('info', message, options),

	warn: (message: string, options?: Parameters<typeof log>[2]) => log('warn', message, options),

	error: (message: string, options?: Parameters<typeof log>[2]) => log('error', message, options),

	/**
	 * Create a child logger with a specific context
	 */
	child: (context: string) => ({
		debug: (message: string, options?: Omit<Parameters<typeof log>[2], 'context'>) =>
			log('debug', message, { ...options, context }),

		info: (message: string, options?: Omit<Parameters<typeof log>[2], 'context'>) =>
			log('info', message, { ...options, context }),

		warn: (message: string, options?: Omit<Parameters<typeof log>[2], 'context'>) =>
			log('warn', message, { ...options, context }),

		error: (message: string, options?: Omit<Parameters<typeof log>[2], 'context'>) =>
			log('error', message, { ...options, context })
	}),

	/**
	 * Log HTTP request
	 */
	request: (
		method: string,
		path: string,
		options?: {
			status?: number;
			duration?: number;
			requestId?: string;
			userId?: string;
			userAgent?: string;
		}
	) => {
		const level: LogLevel =
			options?.status && options.status >= 500
				? 'error'
				: options?.status && options.status >= 400
					? 'warn'
					: 'info';

		log(level, `${method} ${path}`, {
			context: 'HTTP',
			data: {
				status: options?.status,
				userAgent: options?.userAgent
			},
			duration: options?.duration,
			requestId: options?.requestId,
			userId: options?.userId
		});
	}
};

// Create context-specific loggers
export const mqttLogger = logger.child('MQTT');
export const dbLogger = logger.child('DB');
export const authLogger = logger.child('AUTH');
export const apiLogger = logger.child('API');
