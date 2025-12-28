<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { base } from '$app/paths';
	import { browser } from '$app/environment';
	import { _ } from 'svelte-i18n';
	import NumberTicker from '$lib/components/NumberTicker.svelte';
	import { Card, Skeleton, StatusIndicator } from '$lib/components/ui/index.js';
	import { DowntimeTimeline, OEEWidget } from '$lib/components/dashboard/index.js';
	import Activity from 'lucide-svelte/icons/activity';
	import TriangleAlert from 'lucide-svelte/icons/triangle-alert';
	import ArrowUpRight from 'lucide-svelte/icons/arrow-up-right';
	import Gauge from 'lucide-svelte/icons/gauge';
	import Banknote from 'lucide-svelte/icons/banknote';
	import Server from 'lucide-svelte/icons/server';
	import { cn } from '$lib/utils.js';
	import type { DashboardData, EngineWithMetrics } from '$lib/types/index.js';

	// SSR data from +page.server.ts
	interface Props {
		data: DashboardData;
	}
	const props: Props = $props();

	// Reactive state for real-time updates (starts with SSR data)
	let data: DashboardData | null = $state(props.data);
	let eventSource: EventSource | null = null;
	let interval: ReturnType<typeof setInterval>;
	let useSSE = $state(true);
	let connectionStatus = $state<'connected' | 'polling' | 'disconnected'>('disconnected');
	let lastUpdate = $state<Date | null>(null);

	async function fetchData() {
		try {
			const res = await fetch(`${base}/api/status`);
			if (res.ok) {
				data = await res.json();
				lastUpdate = new Date();
				connectionStatus = 'polling';
			}
		} catch (e) {
			console.error('Failed to fetch status', e);
			connectionStatus = 'disconnected';
		}
	}

	function connectSSE() {
		if (!browser) return;

		try {
			eventSource = new EventSource(`${base}/api/events`);

			eventSource.onmessage = (event) => {
				try {
					data = JSON.parse(event.data);
					lastUpdate = new Date();
					connectionStatus = 'connected';
				} catch (e) {
					console.error('Failed to parse SSE data:', e);
				}
			};

			eventSource.onerror = () => {
				// Fall back to polling on SSE error
				console.log('SSE connection failed, falling back to polling');
				useSSE = false;
				eventSource?.close();
				interval = setInterval(fetchData, 2000);
			};
		} catch {
			// SSE not supported, use polling
			useSSE = false;
			interval = setInterval(fetchData, 2000);
		}
	}

	onMount(() => {
		if (useSSE && typeof EventSource !== 'undefined') {
			connectSSE();
		} else {
			// Fallback to polling
			interval = setInterval(fetchData, 2000);
		}
	});

	onDestroy(() => {
		if (eventSource) eventSource.close();
		if (interval) clearInterval(interval);
	});

	function getEventLevelColor(level: string) {
		switch (level) {
			case 'error':
				return 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]';
			case 'warning':
				return 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]';
			default:
				return 'bg-blue-500';
		}
	}

	// Fleet status derived
	const fleetStatus = $derived.by(() => {
		if (!data) return { online: 0, warning: 0, offline: 0, total: 0 };
		return {
			online: data.engines.filter((e: EngineWithMetrics) => e.status === 'ok').length,
			warning: data.engines.filter((e: EngineWithMetrics) => e.status === 'warning').length,
			offline: data.engines.filter((e: EngineWithMetrics) => e.status === 'error').length,
			total: data.engines.length
		};
	});

	// Total gas consumption for OEE
	const totalGasConsumption = $derived.by(() => {
		if (!data) return 0;
		return data.engines.reduce(
			(sum: number, e: EngineWithMetrics) => sum + (e.gas_consumption || 0),
			0
		);
	});
</script>

{#if !data}
	<!-- Loading skeleton -->
	<div class="space-y-6">
		<div class="grid grid-cols-1 gap-4 md:grid-cols-4">
			{#each { length: 4 } as _item, i (i)}
				<Card>
					<Skeleton height="1rem" width="60%" />
					<Skeleton height="2.5rem" width="80%" class="mt-2" />
					<Skeleton height="0.75rem" width="50%" class="mt-4" />
				</Card>
			{/each}
		</div>
		<Skeleton height="1.5rem" width="200px" />
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
			{#each { length: 6 } as _item, i (i)}
				<Card>
					<Skeleton height="8rem" />
				</Card>
			{/each}
		</div>
	</div>
{:else}
	<div class="grid grid-cols-1 gap-6 xl:grid-cols-4">
		<!-- Main Content (Left) -->
		<div class="space-y-6 xl:col-span-3">
			<!-- Hero Stats -->
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
				<!-- Fleet Status Card -->
				<Card class="group relative overflow-hidden">
					<div
						class="absolute -top-4 -right-4 opacity-10 transition-transform group-hover:scale-110"
					>
						<Server size={100} />
					</div>
					<h3 class="text-sm font-medium text-slate-400">{$_('dashboard.fleetStatus.title')}</h3>
					<div class="mt-2 flex items-baseline gap-2">
						<span class="text-4xl font-bold tracking-tight text-white">
							{fleetStatus.online}
						</span>
						<span class="text-sm font-medium text-slate-500">/ {fleetStatus.total}</span>
					</div>
					<div class="mt-4 flex items-center gap-4 text-xs">
						<span class="flex items-center gap-1.5 text-emerald-400">
							<span class="h-2 w-2 rounded-full bg-emerald-500"></span>
							{fleetStatus.online}
							{$_('dashboard.fleetStatus.online')}
						</span>
						{#if fleetStatus.warning > 0}
							<span class="flex items-center gap-1.5 text-amber-400">
								<span class="h-2 w-2 rounded-full bg-amber-500"></span>
								{fleetStatus.warning}
							</span>
						{/if}
						{#if fleetStatus.offline > 0}
							<span class="flex items-center gap-1.5 text-rose-400">
								<span class="h-2 w-2 rounded-full bg-rose-500"></span>
								{fleetStatus.offline}
							</span>
						{/if}
					</div>
				</Card>

				<!-- Power Card -->
				<Card class="group relative overflow-hidden">
					<div
						class="absolute -top-4 -right-4 opacity-10 transition-transform group-hover:scale-110"
					>
						<Activity size={100} />
					</div>
					<h3 class="text-sm font-medium text-slate-400">{$_('dashboard.totalOutput')}</h3>
					<div class="mt-2 flex items-baseline gap-2">
						<span class="text-4xl font-bold tracking-tight text-white">
							<NumberTicker value={data.summary.totalPowerMW * 1000} currency="" />
						</span>
						<span class="text-sm font-medium text-slate-500">{$_('common.kw')}</span>
					</div>
					<div class="mt-4 flex items-center gap-2 text-xs text-emerald-400">
						<ArrowUpRight size={14} />
						<span>{Math.round(data.summary.efficiency)}% {$_('dashboard.ofTarget')}</span>
					</div>
				</Card>

				<!-- Efficiency Card -->
				<Card class="group relative overflow-hidden">
					<div
						class="absolute -top-4 -right-4 opacity-10 transition-transform group-hover:scale-110"
					>
						<Gauge size={100} />
					</div>
					<h3 class="text-sm font-medium text-slate-400">{$_('dashboard.plantEfficiency')}</h3>
					<div class="mt-2 flex items-baseline gap-2">
						<span class="text-4xl font-bold tracking-tight text-white">
							{data.summary.efficiency.toFixed(1)}
						</span>
						<span class="text-sm font-medium text-slate-500">%</span>
					</div>
					<div class="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
						<div
							class="h-full bg-linear-to-r from-cyan-500 to-blue-500 transition-all duration-1000"
							style="width: {Math.min(data.summary.efficiency, 100)}%"
						></div>
					</div>
				</Card>

				<!-- Money Drain Card -->
				<Card variant="danger" class="group relative overflow-hidden">
					<div
						class="absolute -top-4 -right-4 text-rose-500 opacity-10 transition-transform group-hover:scale-110"
					>
						<Banknote size={100} />
					</div>
					<h3 class="text-sm font-medium text-rose-200">{$_('dashboard.financialLoss')}</h3>
					<div class="neon-text-red mt-2 flex items-baseline gap-2 text-rose-400">
						<span class="text-4xl font-bold tracking-tight">
							<NumberTicker value={data.summary.currentLoss} />
						</span>
					</div>
					<div class="mt-4 text-xs text-rose-300/60">
						{$_('dashboard.potentialMonthly')}: {(
							(data.summary.currentLoss * 24 * 30) /
							1000000
						).toFixed(1)}M ₽
					</div>
				</Card>
			</div>

			<!-- OEE and Downtime Row -->
			<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
				<OEEWidget
					totalPowerMW={data.summary.totalPowerMW}
					plannedPowerMW={data.summary.totalPlannedMW}
					gasConsumption={totalGasConsumption}
				/>
				<DowntimeTimeline />
			</div>

			<!-- Engine Grid -->
			<div class="flex items-center justify-between">
				<h2 class="flex items-center gap-2 text-lg font-semibold text-white">
					<div class="h-2 w-2 animate-pulse rounded-full bg-cyan-400"></div>
					{$_('dashboard.liveFleetStatus')}
				</h2>
				<div class="flex items-center gap-2 text-xs">
					{#if connectionStatus === 'connected'}
						<span class="flex items-center gap-1.5 text-emerald-400">
							<span class="relative flex h-2 w-2">
								<span
									class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"
								></span>
								<span class="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
							</span>
							Live SSE
						</span>
					{:else if connectionStatus === 'polling'}
						<span class="flex items-center gap-1.5 text-amber-400">
							<span class="h-2 w-2 rounded-full bg-amber-500"></span>
							Polling
						</span>
					{:else}
						<span class="flex items-center gap-1.5 text-rose-400">
							<span class="h-2 w-2 rounded-full bg-rose-500"></span>
							Disconnected
						</span>
					{/if}
					{#if lastUpdate}
						<span class="text-slate-500">
							{lastUpdate.toLocaleTimeString()}
						</span>
					{/if}
				</div>
			</div>

			<div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
				{#each data.engines as engine (engine.id)}
					<a
						href="{base}/engine/{engine.id}"
						class="glass-card group relative rounded-xl p-5 transition-all hover:-translate-y-1 hover:bg-white/5"
					>
						<!-- Status Indicator -->
						<div class="absolute top-5 right-5">
							<StatusIndicator status={engine.status} />
						</div>

						<div class="mb-4">
							<div class="text-lg font-bold text-white transition-colors group-hover:text-cyan-400">
								{engine.id.toUpperCase()}
							</div>
							<div class="text-xs text-slate-500">{engine.model}</div>
						</div>

						<div class="grid grid-cols-2 gap-x-2 gap-y-4 text-sm">
							<div>
								<div class="mb-1 text-xs text-slate-500">{$_('engine.load')}</div>
								<div class="font-mono text-white">
									{engine.power_kw.toFixed(0)}
									<span class="text-xs text-slate-500">{$_('common.kw')}</span>
								</div>
							</div>
							<div>
								<div class="mb-1 text-xs text-slate-500">{$_('engine.profitability')}</div>
								<div
									class={cn(
										'font-mono font-medium',
										engine.profit_rate > 0 ? 'text-emerald-400' : 'text-rose-400'
									)}
								>
									{engine.profit_rate > 0 ? '+' : ''}{Math.round(engine.profit_rate)}
									<span class="text-xs opacity-50">₽/ч</span>
								</div>
							</div>
							<div>
								<div class="mb-1 text-xs text-slate-500">{$_('engine.temp')}</div>
								<div
									class={cn(
										'font-mono',
										engine.temp > 500 ? 'animate-pulse text-rose-400' : 'text-slate-300'
									)}
								>
									{engine.temp.toFixed(0)}{$_('common.celsius')}
								</div>
							</div>
							<div>
								<div class="mb-1 text-xs text-slate-500">{$_('engine.vibration')}</div>
								<div
									class={cn(
										'font-mono',
										engine.vibration > 10 ? 'text-amber-400' : 'text-slate-300'
									)}
								>
									{engine.vibration.toFixed(1)} <span class="text-xs opacity-50">mm/s</span>
								</div>
							</div>
						</div>
					</a>
				{/each}
			</div>
		</div>

		<!-- Sidebar (Right) - Event Feed -->
		<div
			class="glass-card sticky top-24 flex h-[calc(100vh-120px)] flex-col overflow-hidden rounded-xl p-0"
		>
			<div class="border-b border-white/5 bg-slate-900/50 p-4 backdrop-blur-xl">
				<h3 class="flex items-center gap-2 font-semibold text-slate-200">
					<TriangleAlert size={16} class="text-amber-400" />
					{$_('dashboard.liveEvents')}
				</h3>
			</div>

			<div class="flex-1 space-y-3 overflow-y-auto p-4">
				{#each data.events as event (event.id)}
					<a
						href="{base}/engine/{event.engine_id}"
						class="flex gap-3 rounded-lg border border-white/5 bg-white/5 p-3 text-sm transition hover:bg-white/10"
					>
						<div class="mt-0.5 shrink-0">
							<div class={cn('h-2 w-2 rounded-full', getEventLevelColor(event.level))}></div>
						</div>
						<div>
							<div class="mb-1 text-xs text-slate-500">
								{new Date(event.time).toLocaleTimeString()}
								{#if event.engine_id}
									<span class="ml-2 text-cyan-400">{event.engine_id.toUpperCase()}</span>
								{/if}
							</div>
							<div class="leading-snug text-slate-200">
								{event.message}
							</div>
						</div>
					</a>
				{/each}

				{#if data.events.length === 0}
					<div class="py-10 text-center text-sm text-slate-600">{$_('dashboard.noEvents')}</div>
				{/if}
			</div>
		</div>
	</div>
{/if}
