<script lang="ts">
	import { _, isLoading } from 'svelte-i18n';
	import { Card, Badge, Button } from '$lib/components/ui/index.js';
	import { toastStore } from '$lib/state/toast.svelte.js';
	import { cn } from '$lib/utils.js';
	import Cable from 'lucide-svelte/icons/cable';
	import Server from 'lucide-svelte/icons/server';
	import Wifi from 'lucide-svelte/icons/wifi';
	import Database from 'lucide-svelte/icons/database';
	import Cloud from 'lucide-svelte/icons/cloud';
	import Cpu from 'lucide-svelte/icons/cpu';
	import CheckCircle from 'lucide-svelte/icons/check-circle';
	import Settings from 'lucide-svelte/icons/settings';
	import Play from 'lucide-svelte/icons/play';
	import Pause from 'lucide-svelte/icons/pause';
	import RefreshCw from 'lucide-svelte/icons/refresh-cw';
	import Activity from 'lucide-svelte/icons/activity';
	import Code from 'lucide-svelte/icons/code';
	import FileJson from 'lucide-svelte/icons/file-json';
	import Copy from 'lucide-svelte/icons/copy';
	import ExternalLink from 'lucide-svelte/icons/external-link';

	interface Integration {
		id: string;
		name: string;
		descKey: string;
		icon: typeof Cable;
		status: 'connected' | 'disconnected' | 'pending';
		devices: number;
		dataPoints: number;
	}

	let integrations = $state<Integration[]>([
		{
			id: 'modbus',
			name: 'Modbus TCP/RTU',
			descKey: 'integrations.sources.modbus',
			icon: Cable,
			status: 'connected',
			devices: 4,
			dataPoints: 128
		},
		{
			id: 'opcua',
			name: 'OPC UA',
			descKey: 'integrations.sources.opcua',
			icon: Server,
			status: 'connected',
			devices: 2,
			dataPoints: 256
		},
		{
			id: 'mqtt',
			name: 'MQTT Broker',
			descKey: 'integrations.sources.mqtt',
			icon: Wifi,
			status: 'disconnected',
			devices: 0,
			dataPoints: 0
		},
		{
			id: 'database',
			name: 'PostgreSQL',
			descKey: 'integrations.sources.database',
			icon: Database,
			status: 'connected',
			devices: 1,
			dataPoints: 0
		},
		{
			id: 'cloud',
			name: 'Cloud Sync',
			descKey: 'integrations.sources.cloud',
			icon: Cloud,
			status: 'pending',
			devices: 0,
			dataPoints: 0
		}
	]);

	// Live data with real-time updates simulation
	let recentData = $state([
		{
			id: 'gpu1_exhaust',
			tagKey: 'integrations.tags.gpu1Exhaust',
			value: '485.2',
			unit: '°C',
			secondsAgo: 2
		},
		{
			id: 'gpu1_power',
			tagKey: 'integrations.tags.gpu1Power',
			value: '3128',
			unitKey: 'units.kw',
			secondsAgo: 2
		},
		{
			id: 'gpu2_vib',
			tagKey: 'integrations.tags.gpu2Vibration',
			value: '2.34',
			unitKey: 'units.mms',
			secondsAgo: 2
		},
		{
			id: 'gpu3_pressure',
			tagKey: 'integrations.tags.gpu3Pressure',
			value: '1.85',
			unitKey: 'units.bar',
			secondsAgo: 2
		},
		{
			id: 'gpu4_oil',
			tagKey: 'integrations.tags.gpu4OilTemp',
			value: '78.5',
			unit: '°C',
			secondsAgo: 3
		}
	]);

	const apiEndpoints = [
		{ method: 'GET', path: '/api/status', descKey: 'integrations.api.statusDesc' },
		{ method: 'GET', path: '/api/history/:id', descKey: 'integrations.api.historyDesc' },
		{ method: 'GET', path: '/api/events', descKey: 'integrations.api.eventsDesc' },
		{ method: 'POST', path: '/api/telemetry', descKey: 'integrations.api.telemetryDesc' }
	];

	let copiedEndpoint = $state<string | null>(null);
	let connecting = $state<string | null>(null);
	let refreshing = $state(false);

	// Simulate live data updates
	$effect(() => {
		const interval = setInterval(() => {
			recentData = recentData.map((d) => ({
				...d,
				secondsAgo: d.secondsAgo + 1,
				// Add small random variations to values
				value:
					d.id === 'gpu1_exhaust'
						? (485 + Math.random() * 2 - 1).toFixed(1)
						: d.id === 'gpu1_power'
							? Math.floor(3100 + Math.random() * 60).toString()
							: d.id === 'gpu2_vib'
								? (2.3 + Math.random() * 0.1).toFixed(2)
								: d.id === 'gpu3_pressure'
									? (1.8 + Math.random() * 0.1).toFixed(2)
									: (78 + Math.random() * 1).toFixed(1)
			}));

			// Reset seconds ago every 3 seconds
			if (recentData[0].secondsAgo > 3) {
				recentData = recentData.map((d) => ({ ...d, secondsAgo: 1 }));
			}
		}, 1000);

		return () => clearInterval(interval);
	});

	function copyToClipboard(text: string) {
		navigator.clipboard.writeText(text);
		copiedEndpoint = text;
		toastStore.success('Copied!', `Endpoint ${text} copied to clipboard.`);
		setTimeout(() => (copiedEndpoint = null), 2000);
	}

	function getStatusVariant(status: string): 'success' | 'danger' | 'warning' | 'secondary' {
		switch (status) {
			case 'connected':
				return 'success';
			case 'disconnected':
				return 'danger';
			case 'pending':
				return 'warning';
			default:
				return 'secondary';
		}
	}

	function toggleConnection(integration: Integration) {
		connecting = integration.id;

		setTimeout(() => {
			const idx = integrations.findIndex((i) => i.id === integration.id);
			if (idx !== -1) {
				const wasConnected = integrations[idx].status === 'connected';
				integrations[idx] = {
					...integrations[idx],
					status: wasConnected ? 'disconnected' : 'connected',
					devices: wasConnected ? 0 : integration.id === 'mqtt' ? 3 : integration.devices || 1,
					dataPoints: wasConnected
						? 0
						: integration.id === 'mqtt'
							? 64
							: integration.dataPoints || 32
				};

				if (wasConnected) {
					toastStore.warning('Disconnected', `${integration.name} has been disconnected.`);
				} else {
					toastStore.success(
						'Connected',
						`${integration.name} is now connected and receiving data.`
					);
				}
			}
			connecting = null;
		}, 1500);
	}

	function refreshStatus() {
		refreshing = true;

		setTimeout(() => {
			refreshing = false;
			toastStore.info('Status Updated', 'All integration statuses have been refreshed.');
		}, 1000);
	}

	// Calculate stats dynamically
	const activeConnections = $derived(integrations.filter((i) => i.status === 'connected').length);
	const totalDevices = $derived(integrations.reduce((sum, i) => sum + i.devices, 0));
	const totalDataPoints = $derived(integrations.reduce((sum, i) => sum + i.dataPoints, 0));
</script>

<div class="mx-auto max-w-6xl space-y-6">
	<!-- Header -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="flex items-center gap-3 text-2xl font-bold text-white">
				<Cable class="h-7 w-7 text-cyan-400" />
				{#if !$isLoading}{$_('integrations.title')}{:else}Интеграции{/if}
			</h1>
			<p class="mt-1 text-sm text-slate-400">
				{#if !$isLoading}{$_('integrations.subtitle')}{:else}Подключения к оборудованию{/if}
			</p>
		</div>
		<Button class="gap-2" onclick={refreshStatus} disabled={refreshing}>
			<RefreshCw class={cn('h-4 w-4', refreshing && 'animate-spin')} />
			{#if !$isLoading}{$_('integrations.refreshStatus')}{:else}Обновить статус{/if}
		</Button>
	</div>

	<!-- Stats -->
	<div class="animate-stagger-grid grid grid-cols-2 gap-4 md:grid-cols-4">
		<Card>
			<div class="text-sm text-slate-400">
				{#if !$isLoading}{$_('integrations.stats.activeConnections')}{:else}Активных подключений{/if}
			</div>
			<div class="mt-1 text-2xl font-bold text-emerald-400">
				{activeConnections} / {integrations.length}
			</div>
		</Card>
		<Card>
			<div class="text-sm text-slate-400">
				{#if !$isLoading}{$_('integrations.stats.devicesOnline')}{:else}Устройств онлайн{/if}
			</div>
			<div class="mt-1 text-2xl font-bold text-cyan-400">{totalDevices}</div>
		</Card>
		<Card>
			<div class="text-sm text-slate-400">
				{#if !$isLoading}{$_('integrations.stats.dataPoints')}{:else}Точек данных{/if}
			</div>
			<div class="mt-1 text-2xl font-bold text-purple-400">{totalDataPoints}</div>
		</Card>
		<Card>
			<div class="text-sm text-slate-400">
				{#if !$isLoading}{$_('integrations.stats.messagesPerSec')}{:else}Сообщений/сек{/if}
			</div>
			<div class="mt-1 text-2xl font-bold text-amber-400">
				~{Math.floor(totalDataPoints * 0.65)}
			</div>
		</Card>
	</div>

	<div class="grid gap-6 lg:grid-cols-3">
		<!-- Integrations List -->
		<div class="flex flex-col gap-4 lg:col-span-2">
			<h2 class="flex items-center gap-2 text-lg font-semibold text-white">
				<Server class="h-5 w-5 text-cyan-400" />
				{#if !$isLoading}{$_('integrations.dataSources')}{:else}Источники данных{/if}
			</h2>

			{#each integrations as integration (integration.id)}
				{@const Icon = integration.icon}
				{@const statusVariant = getStatusVariant(integration.status)}
				<Card class={cn('transition', integration.status === 'disconnected' && 'opacity-60')}>
					<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
						<div class="flex items-center gap-4">
							<div
								class={cn(
									'flex h-12 w-12 shrink-0 items-center justify-center rounded-lg',
									integration.status === 'connected'
										? 'bg-cyan-500/20 text-cyan-400'
										: 'bg-slate-700 text-slate-400'
								)}
							>
								<Icon class="h-6 w-6" />
							</div>
							<div class="min-w-0">
								<div class="flex flex-wrap items-center gap-2">
									<h3 class="font-semibold text-white">{integration.name}</h3>
									<Badge variant={statusVariant}>
										{#if !$isLoading}{$_(
												`integrations.status.${integration.status}`
											)}{:else}{integration.status}{/if}
									</Badge>
								</div>
								<p class="text-sm text-slate-400">
									{#if !$isLoading}{$_(integration.descKey)}{:else}—{/if}
								</p>
								{#if integration.devices > 0}
									<p class="mt-1 text-xs text-slate-500">
										{integration.devices}
										{#if !$isLoading}{$_('integrations.devices')}{:else}устройств{/if} • {integration.dataPoints}
										{#if !$isLoading}{$_('integrations.dataPointsLabel')}{:else}точек данных{/if}
									</p>
								{/if}
							</div>
						</div>
						<div class="flex shrink-0 items-center gap-2">
							<Button variant="secondary" size="sm" class="gap-1">
								<Settings class="h-3 w-3" />
								{#if !$isLoading}{$_('integrations.settings')}{:else}Настройки{/if}
							</Button>
							{#if connecting === integration.id}
								<Button size="sm" class="min-w-[100px] gap-1" disabled>
									<div
										class="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"
									></div>
									{integration.status === 'connected' ? 'Disconnecting...' : 'Connecting...'}
								</Button>
							{:else if integration.status === 'connected'}
								<Button
									variant="outline"
									size="sm"
									class="gap-1 border-rose-500/30 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
									onclick={() => toggleConnection(integration)}
								>
									<Pause class="h-3 w-3" />
									{#if !$isLoading}{$_('integrations.disconnect')}{:else}Отключить{/if}
								</Button>
							{:else}
								<Button size="sm" class="gap-1" onclick={() => toggleConnection(integration)}>
									<Play class="h-3 w-3" />
									{#if !$isLoading}{$_('integrations.connect')}{:else}Подключить{/if}
								</Button>
							{/if}
						</div>
					</div>
				</Card>
			{/each}
		</div>

		<!-- Live Data Feed -->
		<div class="flex flex-col gap-4">
			<h2 class="flex items-center gap-2 text-lg font-semibold text-white">
				<Activity class="h-5 w-5 text-emerald-400" />
				{#if !$isLoading}{$_('integrations.dataStream')}{:else}Поток данных{/if}
			</h2>

			<Card class="flex flex-1 flex-col overflow-hidden p-0">
				<div class="border-b border-white/5 bg-slate-900/50 px-4 py-2">
					<span class="flex items-center gap-2 text-xs text-slate-400">
						<span class="relative flex h-2 w-2">
							<span
								class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"
							></span>
							<span class="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
						</span>
						{#if !$isLoading}{$_('integrations.liveFeed')}{:else}Прямой эфир{/if}
					</span>
				</div>
				<div class="flex-1 divide-y divide-white/5 overflow-y-auto">
					{#each recentData as data (data.id)}
						<div class="px-4 py-3 transition hover:bg-white/5">
							<div class="flex items-center justify-between">
								<span class="text-xs font-medium text-cyan-400">
									{#if !$isLoading}{$_(data.tagKey)}{:else}—{/if}
								</span>
								<span class="text-xs text-slate-500">
									{data.secondsAgo}
									{#if !$isLoading}{$_('integrations.secAgo')}{:else}сек назад{/if}
								</span>
							</div>
							<div class="mt-1 flex items-baseline gap-1">
								<span class="text-lg font-bold text-white">{data.value}</span>
								<span class="text-sm text-slate-400">
									{#if data.unitKey}
										{#if !$isLoading}{$_(data.unitKey)}{:else}{data.unitKey}{/if}
									{:else}
										{data.unit}
									{/if}
								</span>
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

		<!-- Mobile Card View -->
		<div class="space-y-3 md:hidden">
			{#each apiEndpoints as endpoint (endpoint.path)}
				<div class="rounded-lg border border-white/5 bg-white/5 p-3">
					<div class="mb-2 flex items-center justify-between">
						<Badge
							variant={endpoint.method === 'GET'
								? 'success'
								: endpoint.method === 'POST'
									? 'info'
									: 'warning'}
						>
							{endpoint.method}
						</Badge>
						<Button
							variant="ghost"
							size="sm"
							onclick={() => copyToClipboard(endpoint.path)}
							class="h-8 w-8 p-0"
						>
							{#if copiedEndpoint === endpoint.path}
								<CheckCircle class="h-4 w-4 text-emerald-400" />
							{:else}
								<Copy class="h-4 w-4" />
							{/if}
						</Button>
					</div>
					<div class="mb-1 font-mono text-xs break-all text-cyan-400">{endpoint.path}</div>
					<div class="text-sm text-slate-400">
						{#if !$isLoading}{$_(endpoint.descKey)}{:else}—{/if}
					</div>
				</div>
			{/each}
		</div>

		<!-- Desktop Table View -->
		<div class="hidden overflow-x-auto md:block">
			<table class="w-full">
				<thead>
					<tr class="border-b border-white/5">
						<th class="px-4 py-2 text-left text-xs font-medium text-slate-400 uppercase">
							{#if !$isLoading}{$_('integrations.api.method')}{:else}Метод{/if}
						</th>
						<th class="px-4 py-2 text-left text-xs font-medium text-slate-400 uppercase">
							Endpoint
						</th>
						<th class="px-4 py-2 text-left text-xs font-medium text-slate-400 uppercase">
							{#if !$isLoading}{$_('integrations.api.description')}{:else}Описание{/if}
						</th>
						<th class="px-4 py-2 text-right text-xs font-medium text-slate-400 uppercase"></th>
					</tr>
				</thead>
				<tbody class="divide-y divide-white/5">
					{#each apiEndpoints as endpoint (endpoint.path)}
						<tr class="transition hover:bg-white/5">
							<td class="px-4 py-3">
								<Badge
									variant={endpoint.method === 'GET'
										? 'success'
										: endpoint.method === 'POST'
											? 'info'
											: 'warning'}
								>
									{endpoint.method}
								</Badge>
							</td>
							<td class="px-4 py-3 font-mono text-sm text-cyan-400">{endpoint.path}</td>
							<td class="px-4 py-3 text-sm text-slate-400">
								{#if !$isLoading}{$_(endpoint.descKey)}{:else}—{/if}
							</td>
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

		<div class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
			<Button variant="secondary" class="gap-2">
				<FileJson class="h-4 w-4" />
				OpenAPI Spec
			</Button>
			<Button variant="ghost" class="gap-2">
				<ExternalLink class="h-4 w-4" />
				{#if !$isLoading}{$_('integrations.documentation')}{:else}Документация{/if}
			</Button>
		</div>
	</Card>

	<!-- Connection Info -->
	<Card class="border-emerald-500/20 bg-emerald-500/5">
		<div class="flex gap-4">
			<Cpu class="h-5 w-5 shrink-0 text-emerald-400" />
			<div class="text-sm text-slate-300">
				<p class="mb-2 font-medium">
					{#if !$isLoading}{$_('integrations.compatibleEquipment')}{:else}Совместимое оборудование{/if}
				</p>
				<p class="text-slate-400">
					<strong class="text-white"
						>{#if !$isLoading}{$_('integrations.plc')}{:else}ПЛК{/if}:</strong
					>
					Siemens S7-300/400/1200/1500, Allen-Bradley ControlLogix/CompactLogix, Schneider Electric M340/M580,
					ОВЕН ПЛК, Delta DVP<br />
					<strong class="text-white">SCADA:</strong> Wonderware, Ignition, WinCC, Genesis64<br />
					<strong class="text-white"
						>{#if !$isLoading}{$_('integrations.gasEngines')}{:else}Газопоршневые{/if}:</strong
					> Jenbacher, MWM, Caterpillar, Wärtsilä, MTU
				</p>
			</div>
		</div>
	</Card>
</div>
