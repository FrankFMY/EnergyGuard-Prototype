<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { base } from '$app/paths';
	import { browser } from '$app/environment';
	import { _ } from 'svelte-i18n';
	import NumberTicker from '$lib/components/NumberTicker.svelte';
	import { Card, Skeleton, StatusIndicator, Toast } from '$lib/components/ui/index.js';
	import { DowntimeTimeline, OEEWidget } from '$lib/components/dashboard/index.js';
	import Activity from 'lucide-svelte/icons/activity';
	import TriangleAlert from 'lucide-svelte/icons/triangle-alert';
	import ArrowUpRight from 'lucide-svelte/icons/arrow-up-right';
	import Gauge from 'lucide-svelte/icons/gauge';
	import Banknote from 'lucide-svelte/icons/banknote';
	import Server from 'lucide-svelte/icons/server';
	import ChevronDown from 'lucide-svelte/icons/chevron-down';
	import { cn } from '$lib/utils.js';
	import { currency as currencyState } from '$lib/state/currency.svelte.js';
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
	let showErrorToast = $state(false);
	let errorMessage = $state('');
	let eventsExpanded = $state(false);

	function triggerError(msg: string) {
		errorMessage = msg;
		showErrorToast = true;
		// Auto-hide after 5 seconds
		setTimeout(() => {
			showErrorToast = false;
		}, 5000);
	}

	async function fetchData() {
		try {
			const res = await fetch(`${base}/api/status`);
			if (res.ok) {
				data = await res.json();
				lastUpdate = new Date();
				connectionStatus = 'polling';
			} else {
				triggerError($_('errors.apiError'));
				connectionStatus = 'disconnected';
			}
		} catch (e) {
			console.error('Failed to fetch status', e);
			triggerError($_('errors.networkError'));
			connectionStatus = 'disconnected';
		}
	}

	function updateDashboardState(
		newData: DashboardData | (Partial<DashboardData> & { type: 'diff' })
	) {
		if (!newData) return;

		// If it's a diff, merge with existing
		if ('type' in newData && newData.type === 'diff' && data) {
			data = {
				engines: newData.engines || data.engines,
				events: newData.events || data.events,
				summary: newData.summary || data.summary,
				timestamp: newData.timestamp || new Date().toISOString()
			};
		} else {
			// Full update
			data = newData as DashboardData;
		}

		lastUpdate = new Date();
		connectionStatus = 'connected';
	}

	function connectSSE() {
		if (!browser) return;

		try {
			connectionStatus = 'polling';
			eventSource = new EventSource(`${base}/api/events`);

			eventSource.onopen = () => {
				connectionStatus = 'connected';
				lastUpdate = new Date();
			};

			eventSource.addEventListener('full', (event) => {
				try {
					updateDashboardState(JSON.parse(event.data));
				} catch (e) {
					console.error('Failed to parse SSE full data:', e);
					triggerError($_('errors.parseError'));
				}
			});

			eventSource.addEventListener('diff', (event) => {
				try {
					updateDashboardState(JSON.parse(event.data));
				} catch (e) {
					console.error('Failed to parse SSE diff data:', e);
					triggerError($_('errors.sseError'));
				}
			});

			eventSource.onmessage = (event) => {
				try {
					if (event.data.startsWith(':')) return;
					updateDashboardState(JSON.parse(event.data));
				} catch (e) {
					console.error('Failed to parse SSE data:', e);
				}
			};

			eventSource.onerror = () => {
				console.log('SSE connection failed, falling back to polling');
				triggerError($_('errors.connectionLost'));
				if (connectionStatus === 'connected') {
					connectionStatus = 'polling';
				}
				useSSE = false;
				eventSource?.close();
				if (!interval) {
					interval = setInterval(fetchData, 2000);
				}
			};
		} catch {
			useSSE = false;
			connectionStatus = 'polling';
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

	// Count of critical/warning events for badge
	const criticalEventsCount = $derived.by(() => {
		if (!data) return 0;
		return data.events.filter((e) => e.level === 'error' || e.level === 'warning').length;
	});
</script>

{#if !data}
	<!-- Loading skeleton -->
	<div class="space-y-6">
		<div class="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
			{#each { length: 4 } as _item, i (i)}
				<Card>
					<Skeleton height="1rem" width="60%" />
					<Skeleton height="2.5rem" width="80%" class="mt-2" />
					<Skeleton height="0.75rem" width="50%" class="mt-4" />
				</Card>
			{/each}
		</div>
		<Skeleton height="1.5rem" width="200px" />
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each { length: 6 } as _item, i (i)}
				<Card>
					<Skeleton height="8rem" />
				</Card>
			{/each}
		</div>
	</div>
{:else}
	<div class="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-4 xl:items-start">
		<!-- Main Content (Left) -->
		<div class="space-y-4 sm:space-y-6 xl:col-span-3">
			<!-- Hero Stats -->
			<div class="animate-stagger-grid grid grid-cols-2 gap-2 xs:gap-3 sm:gap-4 lg:grid-cols-4">
				<!-- Fleet Status Card -->
				<Card class="group relative overflow-hidden p-3 sm:p-4 lg:p-6">
					<div
						class="absolute -top-4 -right-4 opacity-10 transition-transform duration-300 group-hover:scale-110 group-hover:opacity-20"
					>
						<Server size={60} class="sm:hidden" />
						<Server size={80} class="hidden sm:block lg:hidden" />
						<Server size={100} class="hidden lg:block" />
					</div>
					<h3 class="text-[10px] font-medium text-slate-400 xs:text-xs sm:text-sm">
						{$_('dashboard.fleetStatus.title')}
					</h3>
					<div class="mt-1 flex items-baseline gap-1 sm:mt-2 sm:gap-2">
						<span
							class="text-xl font-bold tracking-tight text-white xs:text-2xl sm:text-3xl lg:text-4xl"
						>
							{fleetStatus.online}
						</span>
						<span class="text-[10px] font-medium text-slate-500 xs:text-xs sm:text-sm"
							>/ {fleetStatus.total}</span
						>
					</div>
					<div
						class="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] xs:gap-2 xs:text-xs sm:mt-4 sm:gap-3"
					>
						<span class="flex items-center gap-1 text-emerald-400">
							<span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
							{fleetStatus.online}
							<span class="hidden xs:inline">{$_('dashboard.fleetStatus.online')}</span>
						</span>
						{#if fleetStatus.warning > 0}
							<span class="flex items-center gap-1 text-amber-400">
								<span class="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
								{fleetStatus.warning}
							</span>
						{/if}
						{#if fleetStatus.offline > 0}
							<span class="flex items-center gap-1 text-rose-400">
								<span class="h-1.5 w-1.5 rounded-full bg-rose-500"></span>
								{fleetStatus.offline}
							</span>
						{/if}
					</div>
				</Card>

				<!-- Power Card -->
				<Card class="group relative overflow-hidden p-3 sm:p-4 lg:p-6">
					<div
						class="absolute -top-4 -right-4 opacity-10 transition-transform duration-300 group-hover:scale-110 group-hover:opacity-20"
					>
						<Activity size={60} class="sm:hidden" />
						<Activity size={80} class="hidden sm:block lg:hidden" />
						<Activity size={100} class="hidden lg:block" />
					</div>
					<h3 class="text-[10px] font-medium text-slate-400 xs:text-xs sm:text-sm">
						{$_('dashboard.totalOutput')}
					</h3>
					<div class="mt-1 flex items-baseline gap-1 sm:mt-2 sm:gap-2">
						<span
							class="text-xl font-bold tracking-tight text-white tabular-nums xs:text-2xl sm:text-3xl lg:text-4xl"
						>
							<NumberTicker value={data.summary.totalPowerMW * 1000} unit="" />
						</span>
						<span class="text-[10px] font-medium text-slate-500 xs:text-xs sm:text-sm"
							>{$_('common.kw')}</span
						>
					</div>
					<div
						class="mt-2 flex items-center gap-1 text-[10px] text-emerald-400 xs:text-xs sm:mt-4 sm:gap-2"
					>
						<ArrowUpRight size={10} class="xs:hidden" />
						<ArrowUpRight size={12} class="hidden xs:block sm:hidden" />
						<ArrowUpRight size={14} class="hidden sm:block" />
						<span>{Math.round(data.summary.efficiency)}% {$_('dashboard.ofTarget')}</span>
					</div>
				</Card>

				<!-- Efficiency Card -->
				<Card class="group relative overflow-hidden p-3 sm:p-4 lg:p-6">
					<div
						class="absolute -top-4 -right-4 opacity-10 transition-transform duration-300 group-hover:scale-110 group-hover:opacity-20"
					>
						<Gauge size={60} class="sm:hidden" />
						<Gauge size={80} class="hidden sm:block lg:hidden" />
						<Gauge size={100} class="hidden lg:block" />
					</div>
					<h3 class="text-[10px] font-medium text-slate-400 xs:text-xs sm:text-sm">
						{$_('dashboard.plantEfficiency')}
					</h3>
					<div class="mt-1 flex items-baseline gap-1 sm:mt-2 sm:gap-2">
						<span
							class="text-xl font-bold tracking-tight text-white tabular-nums xs:text-2xl sm:text-3xl lg:text-4xl"
						>
							{data.summary.efficiency.toFixed(1)}
						</span>
						<span class="text-[10px] font-medium text-slate-500 xs:text-xs sm:text-sm">%</span>
					</div>
					<div class="mt-2 h-1 w-full overflow-hidden rounded-full bg-slate-800 sm:mt-4 sm:h-1.5">
						<div
							class="h-full bg-linear-to-r from-cyan-500 to-blue-500 transition-all duration-1000"
							style="width: {Math.min(data.summary.efficiency, 100)}%"
						></div>
					</div>
				</Card>

				<!-- Money Drain Card -->
				<Card variant="danger" class="group relative overflow-hidden p-3 sm:p-4 lg:p-6">
					<div
						class="absolute -top-4 -right-4 text-rose-500 opacity-10 transition-transform duration-300 group-hover:scale-110 group-hover:opacity-20"
					>
						<Banknote size={60} class="sm:hidden" />
						<Banknote size={80} class="hidden sm:block lg:hidden" />
						<Banknote size={100} class="hidden lg:block" />
					</div>
					<h3 class="text-[10px] font-medium text-rose-200 xs:text-xs sm:text-sm">
						{$_('dashboard.financialLoss')}
					</h3>
					<div class="neon-text-red mt-1 flex items-baseline gap-1 text-rose-400 sm:mt-2 sm:gap-2">
						<span
							class="text-xl font-bold tracking-tight tabular-nums xs:text-2xl sm:text-3xl lg:text-4xl"
						>
							<NumberTicker value={data.summary.currentLoss} isCurrency={true} />
						</span>
					</div>
					<div class="mt-2 text-[10px] text-rose-300/60 xs:text-xs sm:mt-4">
						<span class="hidden sm:inline">{$_('dashboard.potentialMonthly')}: </span>
						<span class="sm:hidden">{$_('dashboard.potentialMonthlyShort')}: </span>
						{currencyState.info.symbol}{(
							(currencyState.convert(data.summary.currentLoss) * 24 * 30) /
							1000000
						).toFixed(1)}M
					</div>
				</Card>
			</div>

			<!-- OEE and Downtime Row -->
			<div class="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
				<OEEWidget
					totalPowerMW={data.summary.totalPowerMW}
					plannedPowerMW={data.summary.totalPlannedMW}
					gasConsumption={totalGasConsumption}
				/>
				<DowntimeTimeline />
			</div>

			<!-- Engine Grid Header -->
			<div class="flex flex-col gap-2 xs:flex-row xs:items-center xs:justify-between">
				<h2 class="flex items-center gap-2 text-base font-semibold text-white sm:text-lg">
					<div class="h-2 w-2 animate-pulse rounded-full bg-cyan-400"></div>
					{$_('dashboard.liveFleetStatus')}
				</h2>
				<div class="flex items-center gap-2 text-[10px] xs:text-xs">
					{#if connectionStatus === 'connected'}
						<span class="flex items-center gap-1.5 text-emerald-400">
							<span class="relative flex h-2 w-2">
								<span
									class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"
								></span>
								<span class="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
							</span>
							<span class="hidden xs:inline">{$_('connection.liveSSE')}</span>
						</span>
					{:else if connectionStatus === 'polling'}
						<span class="flex items-center gap-1.5 text-amber-400">
							<span class="h-2 w-2 rounded-full bg-amber-500"></span>
							{$_('connection.polling')}
						</span>
					{:else}
						<span class="flex items-center gap-1.5 text-rose-400">
							<span class="h-2 w-2 rounded-full bg-rose-500"></span>
							{$_('connection.disconnected')}
						</span>
					{/if}
					{#if lastUpdate}
						<span class="text-slate-500">
							{lastUpdate.toLocaleTimeString()}
						</span>
					{/if}
				</div>
			</div>

			<!-- Engine Grid -->
			<div class="grid grid-cols-1 gap-2 xs:gap-3 sm:grid-cols-2 lg:grid-cols-3">
				{#each data.engines as engine, i (engine.id)}
					<a
						href="{base}/engine/{engine.id}"
						class="glass-card card-hover-lift group animate-fade-in relative rounded-xl p-3 opacity-0 xs:p-4 sm:p-5"
						style="animation-delay: {i * 50}ms; animation-fill-mode: forwards;"
						aria-label={$_('dashboard.engineDetails', { values: { id: engine.id.toUpperCase() } })}
					>
						<!-- Hover glow effect -->
						<div
							class="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
							style="background: radial-gradient(600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(34, 211, 238, 0.06), transparent 40%);"
						></div>

						<!-- Status Indicator -->
						<div class="absolute top-3 right-3 xs:top-4 xs:right-4 sm:top-5 sm:right-5">
							<StatusIndicator status={engine.status} />
						</div>

						<div class="mb-2 xs:mb-3 sm:mb-4">
							<div
								class="text-sm font-bold text-white transition-colors duration-200 group-hover:text-cyan-400 xs:text-base sm:text-lg"
							>
								{engine.id.toUpperCase()}
							</div>
							<div
								class="text-[10px] text-slate-500 transition-colors group-hover:text-slate-400 xs:text-xs"
							>
								{engine.model}
							</div>
						</div>

						<div class="grid grid-cols-2 gap-x-2 gap-y-2 text-xs xs:gap-y-3 sm:gap-y-4 sm:text-sm">
							<div>
								<div class="mb-0.5 text-[10px] text-slate-500 xs:mb-1 xs:text-xs">
									{$_('engine.load')}
								</div>
								<div class="font-mono text-white tabular-nums">
									{engine.power_kw.toFixed(0)}
									<span class="text-[10px] text-slate-500 xs:text-xs">{$_('common.kw')}</span>
								</div>
							</div>
							<div>
								<div class="mb-0.5 text-[10px] text-slate-500 xs:mb-1 xs:text-xs">
									{$_('engine.profitability')}
								</div>
								<div
									class={cn(
										'font-mono font-medium tabular-nums transition-colors',
										engine.profit_rate > 0 ? 'text-emerald-400' : 'text-rose-400'
									)}
								>
									{engine.profit_rate > 0 ? '+' : ''}{Math.round(
										currencyState.convert(engine.profit_rate)
									)}
									<span class="text-[10px] opacity-50 xs:text-xs"
										>{currencyState.info.symbol}{$_('common.perHour')}</span
									>
								</div>
							</div>
							<div>
								<div class="mb-0.5 text-[10px] text-slate-500 xs:mb-1 xs:text-xs">
									{$_('engine.temp')}
								</div>
								{#if engine.temp > 500}
									<div class="temp-warning inline-block">
										<span class="font-mono font-semibold text-rose-400 tabular-nums">
											{engine.temp.toFixed(0)}{$_('common.celsius')}
										</span>
									</div>
								{:else}
									<div class="font-mono text-slate-300 tabular-nums transition-colors">
										{engine.temp.toFixed(0)}{$_('common.celsius')}
									</div>
								{/if}
							</div>
							<div>
								<div class="mb-0.5 text-[10px] text-slate-500 xs:mb-1 xs:text-xs">
									{$_('engine.vibration')}
								</div>
								<div
									class={cn(
										'font-mono tabular-nums transition-colors',
										engine.vibration > 10 ? 'text-amber-400' : 'text-slate-300'
									)}
								>
									{engine.vibration.toFixed(1)}
									<span class="text-[10px] opacity-50 xs:text-xs">{$_('units.mms')}</span>
								</div>
							</div>
						</div>

						<!-- Arrow indicator -->
						<div
							class="absolute right-3 bottom-3 opacity-0 transition-all duration-200 group-hover:translate-x-1 group-hover:opacity-100 xs:right-4 xs:bottom-4"
						>
							<ArrowUpRight class="h-4 w-4 text-cyan-400" />
						</div>
					</a>
				{/each}
			</div>
		</div>

		<!-- Sidebar (Right) - Event Feed - Collapsible on mobile -->
		<div
			class="glass-card order-last h-fit overflow-hidden rounded-xl p-0 xl:sticky xl:top-24 xl:flex xl:max-h-[calc(100vh-140px)] xl:flex-col"
		>
			<!-- Header - Clickable on mobile to expand/collapse -->
			<button
				type="button"
				class="flex w-full items-center justify-between border-b border-white/5 bg-slate-900/50 p-3 text-left backdrop-blur-xl sm:p-4 xl:cursor-default"
				onclick={() => (eventsExpanded = !eventsExpanded)}
			>
				<h3 class="flex items-center gap-2 text-sm font-semibold text-slate-200 sm:text-base">
					<TriangleAlert size={16} class="text-amber-400" />
					{$_('dashboard.liveEvents')}
					{#if criticalEventsCount > 0}
						<span
							class="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500/20 px-1.5 text-[10px] font-bold text-rose-400"
						>
							{criticalEventsCount}
						</span>
					{/if}
				</h3>
				<ChevronDown
					class={cn(
						'h-5 w-5 text-slate-400 transition-transform xl:hidden',
						eventsExpanded && 'rotate-180'
					)}
				/>
			</button>

			<!-- Events List -->
			<div
				class={cn(
					'overflow-hidden transition-all duration-300 xl:flex xl:max-h-none xl:flex-1 xl:flex-col',
					eventsExpanded ? 'max-h-[50vh]' : 'max-h-0 xl:max-h-none'
				)}
			>
				<div class="space-y-2 overflow-y-auto p-3 sm:p-4 xl:flex-1">
					{#each data.events.slice(0, 10) as event, i (event.id)}
						<a
							href="{base}/engine/{event.engine_id}"
							class="animate-slide-in-right flex gap-2 rounded-lg border border-white/5 bg-white/5 p-2 text-xs opacity-0 transition-all duration-200 hover:border-white/10 hover:bg-white/10 sm:gap-3 sm:p-3 sm:text-sm"
							style="animation-delay: {i * 30}ms; animation-fill-mode: forwards;"
						>
							<div class="mt-0.5 shrink-0">
								<div
									class={cn(
										'h-2 w-2 rounded-full transition-shadow',
										getEventLevelColor(event.level),
										event.level === 'error' && 'shadow-md shadow-rose-500/50',
										event.level === 'warning' && 'shadow-md shadow-amber-500/50'
									)}
								></div>
							</div>
							<div class="min-w-0 flex-1">
								<div class="mb-0.5 text-[10px] text-slate-500 xs:text-xs sm:mb-1">
									{new Date(event.time).toLocaleTimeString()}
									{#if event.engine_id}
										<span class="ml-1 font-medium text-cyan-400 sm:ml-2"
											>{event.engine_id.toUpperCase()}</span
										>
									{/if}
								</div>
								<div
									class="line-clamp-2 text-[11px] leading-snug text-slate-200 xs:text-xs sm:text-sm"
								>
									{event.message}
								</div>
							</div>
						</a>
					{/each}

					{#if data.events.length === 0}
						<div class="py-8 text-center text-xs text-slate-600 sm:py-10 sm:text-sm">
							{$_('dashboard.noEvents')}
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>
{/if}

{#if showErrorToast}
	<div
		class="animate-fade-in fixed right-3 bottom-3 left-3 z-50 sm:right-6 sm:bottom-6 sm:left-auto sm:w-full sm:max-w-sm"
	>
		<Toast
			variant="error"
			title={$_('errors.title')}
			message={errorMessage}
			onclose={() => (showErrorToast = false)}
		/>
	</div>
{/if}
