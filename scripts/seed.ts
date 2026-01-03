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
			name: 'Admin User',
			email: 'admin@kastor.io',
			emailVerified: true,
			role: 'admin' as const
		},
		{
			id: 'user-operator',
			name: 'Operator User',
			email: 'operator@kastor.io',
			emailVerified: true,
			role: 'operator' as const
		},
		{
			id: 'user-technician',
			name: 'John Technician',
			email: 'technician@kastor.io',
			emailVerified: true,
			role: 'technician' as const
		},
		{
			id: 'user-viewer',
			name: 'Viewer User',
			email: 'viewer@kastor.io',
			emailVerified: true,
			role: 'viewer' as const
		}
	];

	await db.insert(schema.users).values(usersData).onConflictDoNothing();

	// Create accounts for password auth
	const accountsData = usersData.map((user) => ({
		id: `account-${user.id}`,
		userId: user.id,
		accountId: user.id,
		providerId: 'credential',
		password: passwordHash
	}));

	await db.insert(schema.accounts).values(accountsData).onConflictDoNothing();

	// 2. Create engines
	console.log('⚙️ Creating engines...');
	const enginesData = [
		{ id: 'gpu-1', model: 'Jenbacher J620', status: 'ok' as const, total_hours: 18500 },
		{ id: 'gpu-2', model: 'Jenbacher J620', status: 'warning' as const, total_hours: 12300 },
		{ id: 'gpu-3', model: 'Caterpillar CG170-12', status: 'ok' as const, total_hours: 9800 },
		{ id: 'gpu-4', model: 'Caterpillar CG170-12', status: 'ok' as const, total_hours: 7200 },
		{ id: 'gpu-5', model: 'Jenbacher J420', status: 'ok' as const, total_hours: 1850 },
		{ id: 'gpu-6', model: 'Jenbacher J420', status: 'ok' as const, total_hours: 100 }
	];

	await db.insert(schema.engines).values(enginesData).onConflictDoNothing();

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
			name: 'High Exhaust Temperature',
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
			name: 'Vibration Warning',
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
			name: 'Low Power Output',
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
			name: 'Critical Vibration',
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
			name: 'Low Gas Pressure',
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
			title: 'Exhaust Temp Critical',
			message: 'Exhaust temperature exceeded 530°C threshold for more than 5 minutes',
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
			title: 'Vibration Above Normal',
			message: 'Vibration level at 10.4 mm/s exceeds warning threshold of 8 mm/s',
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
			title: 'Power Output Low',
			message: 'Power output dropped below 1000 kW threshold',
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
			title: 'Scheduled Maintenance Due',
			message: 'Engine GPU-1 is approaching scheduled maintenance interval',
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
			title: 'Gas Pressure Low',
			message: 'Input gas pressure below minimum operating threshold',
			metric: 'gas_pressure',
			threshold: 2.5,
			actualValue: 2.1,
			createdAt: new Date(now.getTime() - 5 * 60 * 1000)
		}
	];

	await db.insert(schema.alerts).values(alertsData).onConflictDoNothing();

	// 6. Create work orders
	console.log('📝 Creating work orders...');
	const workOrdersData = [
		{
			id: 'wo-001',
			title: 'Scheduled Oil Change',
			description: 'Regular maintenance oil change as per 2000h service interval',
			engineId: 'gpu-1',
			status: 'open' as const,
			priority: 'medium' as const,
			assignedTo: null,
			createdBy: 'user-operator',
			createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
			dueDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
			estimatedHours: 4,
			partsRequired: ['Oil filter', 'Engine oil 20L']
		},
		{
			id: 'wo-002',
			title: 'Spark Plug Replacement',
			description: 'Replace all 20 spark plugs due to wear',
			engineId: 'gpu-2',
			status: 'in_progress' as const,
			priority: 'high' as const,
			assignedTo: 'user-technician',
			createdBy: 'user-operator',
			createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
			dueDate: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000),
			estimatedHours: 6,
			partsRequired: ['Spark plugs x20']
		},
		{
			id: 'wo-003',
			title: 'Air Filter Inspection',
			description: 'Inspect and clean or replace air filter based on condition',
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
			partsRequired: ['Air filter (if needed)']
		},
		{
			id: 'wo-004',
			title: 'Vibration Analysis',
			description: 'Investigate elevated vibration levels reported by monitoring system',
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

	await db.insert(schema.workOrders).values(workOrdersData).onConflictDoNothing();

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
				power_kw: 1800 + Math.random() * 400,
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
			message: 'System started',
			engine_id: null,
			time: new Date(now.getTime() - 24 * 60 * 60 * 1000)
		},
		{
			level: 'info',
			message: 'GPU-1 engine started',
			engine_id: 'gpu-1',
			time: new Date(now.getTime() - 23 * 60 * 60 * 1000)
		},
		{
			level: 'warning',
			message: 'GPU-2 exhaust temperature rising',
			engine_id: 'gpu-2',
			time: new Date(now.getTime() - 2 * 60 * 60 * 1000)
		},
		{
			level: 'error',
			message: 'GPU-2 critical temperature alert triggered',
			engine_id: 'gpu-2',
			time: new Date(now.getTime() - 15 * 60 * 1000)
		},
		{
			level: 'info',
			message: 'Work order WO-003 completed',
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
