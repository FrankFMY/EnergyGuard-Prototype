/**
 * Database seed script for KASTOR IoT demo data
 * Run: bun run scripts/seed.ts
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../src/lib/server/db/schema.js';
import { hash } from '@node-rs/argon2';

const DATABASE_URL =
	process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/kastor';

const client = postgres(DATABASE_URL);
const db = drizzle(client, { schema });

async function seed() {
	console.log('🌱 Starting database seed...\n');

	// 1. Create demo users
	console.log('👥 Creating users...');
	const passwordHash = await hash('demo1234', {
		memoryCost: 19456,
		timeCost: 2,
		outputLen: 32,
		parallelism: 1
	});

	const usersData = [
		{
			id: 'user-admin',
			name: 'Иван Петров',
			email: 'admin@kastor.io',
			emailVerified: true,
			role: 'admin' as const
		},
		{
			id: 'user-operator',
			name: 'Мария Сидорова',
			email: 'operator@kastor.io',
			emailVerified: true,
			role: 'operator' as const
		},
		{
			id: 'user-technician',
			name: 'Алексей Козлов',
			email: 'technician@kastor.io',
			emailVerified: true,
			role: 'technician' as const
		},
		{
			id: 'user-viewer',
			name: 'Елена Волкова',
			email: 'viewer@kastor.io',
			emailVerified: true,
			role: 'viewer' as const
		}
	];

	// Use upsert to ensure users exist
	// Don't update email in conflict to avoid unique constraint violation
	for (const user of usersData) {
		await db
			.insert(schema.users)
			.values(user)
			.onConflictDoUpdate({
				target: schema.users.id,
				set: {
					name: user.name,
					emailVerified: user.emailVerified,
					role: user.role
					// Don't update email - it might conflict with unique constraint
				}
			});
	}

	// Create accounts for password auth
	const accountsData = usersData.map((user) => ({
		id: `account-${user.id}`,
		userId: user.id,
		accountId: user.id,
		providerId: 'credential',
		password: passwordHash
	}));

	// Use upsert for accounts too
	for (const account of accountsData) {
		await db
			.insert(schema.accounts)
			.values(account)
			.onConflictDoUpdate({
				target: schema.accounts.id,
				set: {
					password: account.password
				}
			});
	}

	// 2. Create engines
	console.log('⚙️ Creating engines...');
	const enginesData = [
		{ id: 'gpu-1', model: 'Weichai 16VCN', status: 'ok' as const, total_hours: 8500 },
		{ id: 'gpu-2', model: 'Weichai 16VCN', status: 'warning' as const, total_hours: 12300 },
		{ id: 'gpu-3', model: 'Yuchai YC16V', status: 'ok' as const, total_hours: 9800 },
		{ id: 'gpu-4', model: 'Yuchai YC16V', status: 'ok' as const, total_hours: 7200 },
		{ id: 'gpu-5', model: 'Jenbacher J620', status: 'ok' as const, total_hours: 1850 },
		{ id: 'gpu-6', model: 'Jenbacher J620', status: 'ok' as const, total_hours: 100 }
	];

	// Use upsert to update existing engines with new model names
	for (const engine of enginesData) {
		await db
			.insert(schema.engines)
			.values(engine)
			.onConflictDoUpdate({
				target: schema.engines.id,
				set: {
					model: engine.model,
					status: engine.status,
					total_hours: engine.total_hours
				}
			});
	}

	// 3. Create spare parts
	console.log('🔧 Creating spare parts...');
	const sparePartsData = [
		{
			id: 'part-1',
			name: 'Масляный фильтр',
			part_number: 'OF-J620-001',
			quantity: 12,
			min_quantity: 5,
			unit_cost: 2500
		},
		{
			id: 'part-2',
			name: 'Воздушный фильтр',
			part_number: 'AF-J620-002',
			quantity: 8,
			min_quantity: 4,
			unit_cost: 4500
		},
		{
			id: 'part-3',
			name: 'Свеча зажигания',
			part_number: 'SP-J620-003',
			quantity: 24,
			min_quantity: 20,
			unit_cost: 1200
		},
		{
			id: 'part-4',
			name: 'Ремень ГРМ',
			part_number: 'TB-J620-004',
			quantity: 2,
			min_quantity: 2,
			unit_cost: 15000
		},
		{
			id: 'part-5',
			name: 'Прокладка ГБЦ',
			part_number: 'HG-J620-005',
			quantity: 1,
			min_quantity: 2,
			unit_cost: 8500
		},
		{
			id: 'part-6',
			name: 'Масло моторное 20L',
			part_number: 'OIL-20L-001',
			quantity: 10,
			min_quantity: 5,
			unit_cost: 12000
		},
		{
			id: 'part-7',
			name: 'Охлаждающая жидкость 10L',
			part_number: 'COOL-10L-001',
			quantity: 6,
			min_quantity: 4,
			unit_cost: 3500
		}
	];

	await db.insert(schema.spareParts).values(sparePartsData).onConflictDoNothing();

	// 4. Create alert rules
	console.log('📋 Creating alert rules...');
	const alertRulesData = [
		{
			id: 'rule-1',
			name: 'Высокая температура выхлопа',
			engineId: null,
			metric: 'temp_exhaust',
			operator: 'gt',
			threshold: 530,
			durationSeconds: 300,
			severity: 'critical' as const,
			enabled: true,
			notifyEmail: true,
			notifySms: true,
			notifyPush: true
		},
		{
			id: 'rule-2',
			name: 'Предупреждение о вибрации',
			engineId: null,
			metric: 'vibration',
			operator: 'gt',
			threshold: 8,
			durationSeconds: 60,
			severity: 'warning' as const,
			enabled: true,
			notifyEmail: true,
			notifySms: false,
			notifyPush: true
		},
		{
			id: 'rule-3',
			name: 'Низкая выходная мощность',
			engineId: null,
			metric: 'power_kw',
			operator: 'lt',
			threshold: 1000,
			durationSeconds: 120,
			severity: 'warning' as const,
			enabled: true,
			notifyEmail: true,
			notifySms: false,
			notifyPush: true
		},
		{
			id: 'rule-4',
			name: 'Критическая вибрация',
			engineId: null,
			metric: 'vibration',
			operator: 'gt',
			threshold: 15,
			durationSeconds: 30,
			severity: 'critical' as const,
			enabled: true,
			notifyEmail: true,
			notifySms: true,
			notifyPush: true
		},
		{
			id: 'rule-5',
			name: 'Низкое давление газа',
			engineId: null,
			metric: 'gas_pressure',
			operator: 'lt',
			threshold: 2.5,
			durationSeconds: 60,
			severity: 'critical' as const,
			enabled: true,
			notifyEmail: true,
			notifySms: true,
			notifyPush: true
		}
	];

	await db.insert(schema.alertRules).values(alertRulesData).onConflictDoNothing();

	// 5. Create demo alerts
	console.log('🚨 Creating alerts...');
	const now = new Date();
	const alertsData = [
		{
			id: 'alert-1',
			engineId: 'gpu-2',
			severity: 'critical' as const,
			status: 'active' as const,
			title: 'Критическая температура выхлопа',
			message: 'Температура выхлопа превысила порог 530°C более 5 минут',
			metric: 'temp_exhaust',
			threshold: 530,
			actualValue: 547,
			createdAt: new Date(now.getTime() - 15 * 60 * 1000)
		},
		{
			id: 'alert-2',
			engineId: 'gpu-2',
			severity: 'warning' as const,
			status: 'acknowledged' as const,
			title: 'Повышенная вибрация',
			message: 'Уровень вибрации 10.4 мм/с превышает предупредительный порог 8 мм/с',
			metric: 'vibration',
			threshold: 8,
			actualValue: 10.4,
			createdAt: new Date(now.getTime() - 45 * 60 * 1000),
			acknowledgedAt: new Date(now.getTime() - 30 * 60 * 1000),
			acknowledgedBy: 'user-operator'
		},
		{
			id: 'alert-3',
			engineId: 'gpu-4',
			severity: 'warning' as const,
			status: 'resolved' as const,
			title: 'Низкая выходная мощность',
			message: 'Выходная мощность упала ниже порога 1000 кВт',
			metric: 'power_kw',
			threshold: 1000,
			actualValue: 892,
			createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
			acknowledgedAt: new Date(now.getTime() - 1.5 * 60 * 60 * 1000),
			resolvedAt: new Date(now.getTime() - 1 * 60 * 60 * 1000),
			acknowledgedBy: 'user-operator'
		},
		{
			id: 'alert-4',
			engineId: 'gpu-1',
			severity: 'info' as const,
			status: 'resolved' as const,
			title: 'Приближается плановое ТО',
			message: 'Двигатель GPU-1 приближается к интервалу планового обслуживания',
			metric: 'total_hours',
			threshold: 2000,
			actualValue: 1950,
			createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
			acknowledgedAt: new Date(now.getTime() - 23 * 60 * 60 * 1000),
			resolvedAt: new Date(now.getTime() - 20 * 60 * 60 * 1000),
			acknowledgedBy: 'user-admin'
		},
		{
			id: 'alert-5',
			engineId: 'gpu-3',
			severity: 'critical' as const,
			status: 'active' as const,
			title: 'Низкое давление газа',
			message: 'Давление входного газа ниже минимального рабочего порога',
			metric: 'gas_pressure',
			threshold: 2.5,
			actualValue: 2.1,
			createdAt: new Date(now.getTime() - 5 * 60 * 1000)
		}
	];

	// Use upsert to ensure alerts have recent timestamps
	for (const alert of alertsData) {
		await db
			.insert(schema.alerts)
			.values(alert)
			.onConflictDoUpdate({
				target: schema.alerts.id,
				set: {
					createdAt: alert.createdAt,
					severity: alert.severity,
					status: alert.status,
					title: alert.title,
					message: alert.message,
					actualValue: alert.actualValue
				}
			});
	}

	// Add more demo alerts for better showcase
	const additionalAlerts = [
		{
			id: 'alert-6',
			engineId: 'gpu-5',
			severity: 'warning' as const,
			status: 'active' as const,
			title: 'Повышенный расход газа',
			message: 'Расход газа превысил нормальный уровень на 15%',
			metric: 'gas_consumption',
			threshold: 450,
			actualValue: 485,
			createdAt: new Date(now.getTime() - 30 * 60 * 1000)
		},
		{
			id: 'alert-7',
			engineId: 'gpu-6',
			severity: 'info' as const,
			status: 'active' as const,
			title: 'Приближается плановое ТО',
			message: 'Двигатель GPU-6 приближается к интервалу планового обслуживания (500 часов)',
			metric: 'total_hours',
			threshold: 500,
			actualValue: 100,
			createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000)
		},
		{
			id: 'alert-8',
			engineId: 'gpu-1',
			severity: 'warning' as const,
			status: 'resolved' as const,
			title: 'Временное снижение мощности',
			message: 'Выходная мощность временно снизилась ниже порога',
			metric: 'power_kw',
			threshold: 1000,
			actualValue: 950,
			createdAt: new Date(now.getTime() - 3 * 60 * 60 * 1000),
			resolvedAt: new Date(now.getTime() - 2.5 * 60 * 60 * 1000),
			acknowledgedBy: 'user-operator'
		}
	];

	for (const alert of additionalAlerts) {
		await db
			.insert(schema.alerts)
			.values(alert)
			.onConflictDoUpdate({
				target: schema.alerts.id,
				set: {
					createdAt: alert.createdAt,
					severity: alert.severity,
					status: alert.status,
					title: alert.title,
					message: alert.message,
					actualValue: alert.actualValue
				}
			});
	}

	// 6. Create work orders
	console.log('📝 Creating work orders...');
	const workOrdersData = [
		{
			id: 'wo-001',
			title: 'Плановая замена масла',
			description: 'Регулярное техническое обслуживание с заменой масла по интервалу 2000ч',
			engineId: 'gpu-1',
			status: 'open' as const,
			priority: 'medium' as const,
			assignedTo: null,
			createdBy: 'user-operator',
			createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
			dueDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
			estimatedHours: 4,
			partsRequired: ['Масляный фильтр', 'Моторное масло 20л']
		},
		{
			id: 'wo-002',
			title: 'Замена свечей зажигания',
			description: 'Заменить все 20 свечей зажигания в связи с износом',
			engineId: 'gpu-2',
			status: 'in_progress' as const,
			priority: 'high' as const,
			assignedTo: 'user-technician',
			createdBy: 'user-operator',
			createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
			dueDate: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000),
			estimatedHours: 6,
			partsRequired: ['Свечи зажигания x20']
		},
		{
			id: 'wo-003',
			title: 'Проверка воздушного фильтра',
			description: 'Осмотреть и очистить или заменить воздушный фильтр по состоянию',
			engineId: 'gpu-4',
			status: 'completed' as const,
			priority: 'low' as const,
			assignedTo: 'user-technician',
			createdBy: 'user-operator',
			createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
			dueDate: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
			completedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
			estimatedHours: 2,
			actualHours: 1.5,
			partsRequired: ['Воздушный фильтр (при необходимости)']
		},
		{
			id: 'wo-004',
			title: 'Анализ вибрации',
			description: 'Исследовать повышенный уровень вибрации, зафиксированный системой мониторинга',
			engineId: 'gpu-2',
			status: 'open' as const,
			priority: 'critical' as const,
			assignedTo: null,
			createdBy: 'user-admin',
			createdAt: new Date(now.getTime() - 4 * 60 * 60 * 1000),
			dueDate: new Date(now.getTime() + 12 * 60 * 60 * 1000),
			estimatedHours: 3,
			partsRequired: []
		}
	];

	// Use upsert to update existing work orders with fresh data
	for (const wo of workOrdersData) {
		await db
			.insert(schema.workOrders)
			.values(wo)
			.onConflictDoUpdate({
				target: schema.workOrders.id,
				set: {
					title: wo.title,
					description: wo.description,
					status: wo.status,
					priority: wo.priority,
					dueDate: wo.dueDate,
					estimatedHours: wo.estimatedHours
				}
			});
	}

	// 7. Create maintenance schedules
	console.log('📅 Creating maintenance schedules...');
	const maintenanceData = [
		{
			id: 'maint-1',
			engine_id: 'gpu-1',
			service_type: 'oil_change' as const,
			due_hours: 20000,
			estimated_cost: 25000,
			parts_required: [
				{ part_id: 'part-1', quantity_needed: 1 },
				{ part_id: 'part-6', quantity_needed: 1 }
			]
		},
		{
			id: 'maint-2',
			engine_id: 'gpu-2',
			service_type: 'spark_plug' as const,
			due_hours: 14000,
			estimated_cost: 35000,
			parts_required: [{ part_id: 'part-3', quantity_needed: 20 }]
		},
		{
			id: 'maint-3',
			engine_id: 'gpu-3',
			service_type: 'filter_replacement' as const,
			due_hours: 11000,
			estimated_cost: 15000,
			parts_required: [
				{ part_id: 'part-1', quantity_needed: 1 },
				{ part_id: 'part-2', quantity_needed: 1 }
			]
		},
		{
			id: 'maint-4',
			engine_id: 'gpu-4',
			service_type: 'major_overhaul' as const,
			due_hours: 25000,
			estimated_cost: 450000,
			parts_required: []
		}
	];

	await db.insert(schema.maintenanceSchedules).values(maintenanceData).onConflictDoNothing();

	// 8. Create cost records for economics
	console.log('💰 Creating cost records...');
	const months = ['2024-07', '2024-08', '2024-09', '2024-10', '2024-11', '2024-12'];
	const costRecordsData: Array<{
		category: string;
		amount: number;
		date: Date;
		description: string;
	}> = [];

	for (const month of months) {
		costRecordsData.push(
			{
				category: 'gas',
				amount: 2850000 + Math.random() * 200000,
				date: new Date(`${month}-15`),
				description: `Gas costs for ${month}`
			},
			{
				category: 'depreciation',
				amount: 950000,
				date: new Date(`${month}-28`),
				description: `Depreciation for ${month}`
			},
			{
				category: 'spare_parts',
				amount: 480000 + Math.random() * 100000,
				date: new Date(`${month}-20`),
				description: `Spare parts for ${month}`
			},
			{
				category: 'labor',
				amount: 480000,
				date: new Date(`${month}-28`),
				description: `Labor costs for ${month}`
			},
			{
				category: 'other',
				amount: 240000 + Math.random() * 50000,
				date: new Date(`${month}-28`),
				description: `Other costs for ${month}`
			}
		);
	}

	await db.insert(schema.costRecords).values(costRecordsData).onConflictDoNothing();

	// 9. Create initial telemetry data
	console.log('📊 Creating telemetry data...');
	const telemetryData: (typeof schema.telemetry.$inferInsert)[] = [];
	const baseTime = new Date();

	for (let i = 0; i < 60; i++) {
		const time = new Date(baseTime.getTime() - i * 60 * 1000);
		for (const engine of ['gpu-1', 'gpu-2', 'gpu-3', 'gpu-4', 'gpu-5', 'gpu-6']) {
			telemetryData.push({
				time,
				engine_id: engine,
				power_kw: 900 + Math.random() * 150,
				temp_exhaust: 450 + Math.random() * 80,
				gas_consumption: 400 + Math.random() * 50,
				vibration: 4 + Math.random() * 4,
				gas_pressure: 2.5 + Math.random() * 1.5
			});
		}
	}

	await db.insert(schema.telemetry).values(telemetryData).onConflictDoNothing();

	// 10. Create some events
	console.log('📜 Creating events...');
	const eventsData = [
		{
			level: 'info',
			message: 'Система запущена',
			engine_id: null,
			time: new Date(now.getTime() - 24 * 60 * 60 * 1000)
		},
		{
			level: 'info',
			message: 'GPU-1 двигатель запущен',
			engine_id: 'gpu-1',
			time: new Date(now.getTime() - 23 * 60 * 60 * 1000)
		},
		{
			level: 'warning',
			message: 'GPU-2 температура выхлопа растёт',
			engine_id: 'gpu-2',
			time: new Date(now.getTime() - 2 * 60 * 60 * 1000)
		},
		{
			level: 'error',
			message: 'GPU-2 сработал алерт критической температуры',
			engine_id: 'gpu-2',
			time: new Date(now.getTime() - 15 * 60 * 1000)
		},
		{
			level: 'info',
			message: 'Наряд-заказ WO-003 завершён',
			engine_id: 'gpu-4',
			time: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
		}
	];

	await db.insert(schema.events).values(eventsData).onConflictDoNothing();

	console.log('\n✅ Database seed completed successfully!');
	console.log('\n📋 Demo credentials:');
	console.log('   Admin: admin@kastor.io / demo1234');
	console.log('   Operator: operator@kastor.io / demo1234');
	console.log('   Technician: technician@kastor.io / demo1234');
	console.log('   Viewer: viewer@kastor.io / demo1234');

	await client.end();
	process.exit(0);
}

seed().catch((error) => {
	console.error('❌ Seed failed:', error);
	process.exit(1);
});
