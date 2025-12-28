<script lang="ts">
	import { Card, Badge, Button } from '$lib/components/ui/index.js';
	import { cn } from '$lib/utils.js';
	import Cable from 'lucide-svelte/icons/cable';
	import Server from 'lucide-svelte/icons/server';
	import Wifi from 'lucide-svelte/icons/wifi';
	import Database from 'lucide-svelte/icons/database';
	import Cloud from 'lucide-svelte/icons/cloud';
	import Cpu from 'lucide-svelte/icons/cpu';
	import CheckCircle from 'lucide-svelte/icons/check-circle';
	import XCircle from 'lucide-svelte/icons/x-circle';
	import Settings from 'lucide-svelte/icons/settings';
	import Play from 'lucide-svelte/icons/play';
	import RefreshCw from 'lucide-svelte/icons/refresh-cw';
	import Activity from 'lucide-svelte/icons/activity';
	import Code from 'lucide-svelte/icons/code';
	import FileJson from 'lucide-svelte/icons/file-json';
	import Copy from 'lucide-svelte/icons/copy';
	import ExternalLink from 'lucide-svelte/icons/external-link';

	const integrations = [
		{
			id: 'modbus',
			name: 'Modbus TCP/RTU',
			description: 'Промышленный протокол для связи с ПЛК',
			icon: Cable,
			status: 'connected',
			devices: 4,
			dataPoints: 128
		},
		{
			id: 'opcua',
			name: 'OPC UA',
			description: 'Унифицированная архитектура OPC',
			icon: Server,
			status: 'connected',
			devices: 2,
			dataPoints: 256
		},
		{
			id: 'mqtt',
			name: 'MQTT Broker',
			description: 'Легковесный протокол IoT',
			icon: Wifi,
			status: 'disconnected',
			devices: 0,
			dataPoints: 0
		},
		{
			id: 'database',
			name: 'PostgreSQL',
			description: 'Хранение исторических данных',
			icon: Database,
			status: 'connected',
			devices: 1,
			dataPoints: 0
		},
		{
			id: 'cloud',
			name: 'Cloud Sync',
			description: 'Синхронизация с облачным хранилищем',
			icon: Cloud,
			status: 'pending',
			devices: 0,
			dataPoints: 0
		}
	];

	const recentData = [
		{ tag: 'GPU1_TEMP_EXHAUST', value: '485.2', unit: '°C', timestamp: '2 сек назад' },
		{ tag: 'GPU1_POWER_KW', value: '3128', unit: 'кВт', timestamp: '2 сек назад' },
		{ tag: 'GPU2_VIBRATION', value: '2.34', unit: 'мм/с', timestamp: '2 сек назад' },
		{ tag: 'GPU3_GAS_PRESSURE', value: '1.85', unit: 'бар', timestamp: '2 сек назад' },
		{ tag: 'GPU4_OIL_TEMP', value: '78.5', unit: '°C', timestamp: '3 сек назад' }
	];

	const apiEndpoints = [
		{ method: 'GET', path: '/api/status', description: 'Текущий статус всех двигателей' },
		{ method: 'GET', path: '/api/history/:id', description: 'История телеметрии двигателя' },
		{ method: 'GET', path: '/api/events', description: 'SSE поток событий в реальном времени' },
		{ method: 'POST', path: '/api/telemetry', description: 'Отправка данных телеметрии' }
	];

	let copiedEndpoint = $state<string | null>(null);

	function copyToClipboard(text: string) {
		navigator.clipboard.writeText(text);
		copiedEndpoint = text;
		setTimeout(() => (copiedEndpoint = null), 2000);
	}

	function getStatusBadge(status: string) {
		switch (status) {
			case 'connected':
				return { variant: 'success' as const, text: 'Подключено' };
			case 'disconnected':
				return { variant: 'danger' as const, text: 'Отключено' };
			case 'pending':
				return { variant: 'warning' as const, text: 'Ожидание' };
			default:
				return { variant: 'secondary' as const, text: status };
		}
	}
</script>

<div class="mx-auto max-w-6xl space-y-6">
	<!-- Header -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="flex items-center gap-3 text-2xl font-bold text-white">
				<Cable class="h-7 w-7 text-cyan-400" />
				Интеграции
			</h1>
			<p class="mt-1 text-sm text-slate-400">Подключения к оборудованию, базам данных и внешним системам</p>
		</div>
		<Button class="gap-2">
			<RefreshCw class="h-4 w-4" />
			Обновить статус
		</Button>
	</div>

	<!-- Stats -->
	<div class="grid grid-cols-2 gap-4 md:grid-cols-4">
		<Card>
			<div class="text-sm text-slate-400">Активных подключений</div>
			<div class="mt-1 text-2xl font-bold text-emerald-400">3 / 5</div>
		</Card>
		<Card>
			<div class="text-sm text-slate-400">Устройств онлайн</div>
			<div class="mt-1 text-2xl font-bold text-cyan-400">7</div>
		</Card>
		<Card>
			<div class="text-sm text-slate-400">Точек данных</div>
			<div class="mt-1 text-2xl font-bold text-purple-400">384</div>
		</Card>
		<Card>
			<div class="text-sm text-slate-400">Сообщений/сек</div>
			<div class="mt-1 text-2xl font-bold text-amber-400">~250</div>
		</Card>
	</div>

	<div class="grid gap-6 lg:grid-cols-3">
		<!-- Integrations List -->
		<div class="lg:col-span-2 space-y-4">
			<h2 class="flex items-center gap-2 text-lg font-semibold text-white">
				<Server class="h-5 w-5 text-cyan-400" />
				Источники данных
			</h2>

			{#each integrations as integration (integration.id)}
				{@const Icon = integration.icon}
				{@const status = getStatusBadge(integration.status)}
				<Card class={cn('transition', integration.status === 'disconnected' && 'opacity-60')}>
					<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
						<div class="flex items-center gap-4">
							<div
								class={cn(
									'flex h-12 w-12 items-center justify-center rounded-lg',
									integration.status === 'connected'
										? 'bg-cyan-500/20 text-cyan-400'
										: 'bg-slate-700 text-slate-400'
								)}
							>
								<Icon class="h-6 w-6" />
							</div>
							<div>
								<div class="flex items-center gap-3">
									<h3 class="font-semibold text-white">{integration.name}</h3>
									<Badge variant={status.variant}>{status.text}</Badge>
								</div>
								<p class="text-sm text-slate-400">{integration.description}</p>
								{#if integration.devices > 0}
									<p class="mt-1 text-xs text-slate-500">
										{integration.devices} устройств • {integration.dataPoints} точек данных
									</p>
								{/if}
							</div>
						</div>
						<div class="flex items-center gap-2">
							<Button variant="secondary" size="sm" class="gap-1">
								<Settings class="h-3 w-3" />
								Настройки
							</Button>
							{#if integration.status === 'disconnected'}
								<Button size="sm" class="gap-1">
									<Play class="h-3 w-3" />
									Подключить
								</Button>
							{/if}
						</div>
					</div>
				</Card>
			{/each}
		</div>

		<!-- Live Data Feed -->
		<div class="space-y-4">
			<h2 class="flex items-center gap-2 text-lg font-semibold text-white">
				<Activity class="h-5 w-5 text-emerald-400" />
				Поток данных
			</h2>

			<Card class="p-0">
				<div class="border-b border-white/5 bg-slate-900/50 px-4 py-2">
					<span class="flex items-center gap-2 text-xs text-slate-400">
						<span class="relative flex h-2 w-2">
							<span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
							<span class="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
						</span>
						Live Feed
					</span>
				</div>
				<div class="max-h-80 overflow-y-auto divide-y divide-white/5">
					{#each recentData as data}
						<div class="px-4 py-3 hover:bg-white/5 transition">
							<div class="flex items-center justify-between">
								<span class="font-mono text-xs text-cyan-400">{data.tag}</span>
								<span class="text-xs text-slate-500">{data.timestamp}</span>
							</div>
							<div class="mt-1 flex items-baseline gap-1">
								<span class="text-lg font-bold text-white">{data.value}</span>
								<span class="text-sm text-slate-400">{data.unit}</span>
							</div>
						</div>
					{/each}
				</div>
			</Card>
		</div>
	</div>

	<!-- API Documentation -->
	<Card>
		<h2 class="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
			<Code class="h-5 w-5 text-purple-400" />
			REST API
		</h2>

		<div class="overflow-x-auto">
			<table class="w-full">
				<thead>
					<tr class="border-b border-white/5">
						<th class="px-4 py-2 text-left text-xs font-medium text-slate-400 uppercase">Метод</th>
						<th class="px-4 py-2 text-left text-xs font-medium text-slate-400 uppercase">Endpoint</th>
						<th class="px-4 py-2 text-left text-xs font-medium text-slate-400 uppercase">Описание</th>
						<th class="px-4 py-2 text-right text-xs font-medium text-slate-400 uppercase"></th>
					</tr>
				</thead>
				<tbody class="divide-y divide-white/5">
					{#each apiEndpoints as endpoint}
						<tr class="hover:bg-white/5 transition">
							<td class="px-4 py-3">
								<Badge
									variant={endpoint.method === 'GET' ? 'success' : endpoint.method === 'POST' ? 'info' : 'warning'}
								>
									{endpoint.method}
								</Badge>
							</td>
							<td class="px-4 py-3 font-mono text-sm text-cyan-400">{endpoint.path}</td>
							<td class="px-4 py-3 text-sm text-slate-400">{endpoint.description}</td>
							<td class="px-4 py-3 text-right">
								<Button
									variant="ghost"
									size="sm"
									onclick={() => copyToClipboard(endpoint.path)}
									class="gap-1"
								>
									{#if copiedEndpoint === endpoint.path}
										<CheckCircle class="h-3 w-3 text-emerald-400" />
									{:else}
										<Copy class="h-3 w-3" />
									{/if}
								</Button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<div class="mt-4 flex items-center gap-4">
			<Button variant="secondary" class="gap-2">
				<FileJson class="h-4 w-4" />
				OpenAPI Spec
			</Button>
			<Button variant="ghost" class="gap-2">
				<ExternalLink class="h-4 w-4" />
				Документация
			</Button>
		</div>
	</Card>

	<!-- Connection Info -->
	<Card class="border-emerald-500/20 bg-emerald-500/5">
		<div class="flex gap-4">
			<Cpu class="h-5 w-5 shrink-0 text-emerald-400" />
			<div class="text-sm text-slate-300">
				<p class="mb-2 font-medium">Совместимое оборудование</p>
				<p class="text-slate-400">
					<strong class="text-white">ПЛК:</strong> Siemens S7-300/400/1200/1500, Allen-Bradley ControlLogix/CompactLogix, 
					Schneider Electric M340/M580, ОВЕН ПЛК, Delta DVP<br />
					<strong class="text-white">SCADA:</strong> Wonderware, Ignition, WinCC, Genesis64<br />
					<strong class="text-white">Газопоршневые:</strong> Jenbacher, MWM, Caterpillar, Wärtsilä, MTU
				</p>
			</div>
		</div>
	</Card>
</div>
