<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { base } from '$app/paths';
	import NumberTicker from '$lib/components/NumberTicker.svelte';
	import Activity from 'lucide-svelte/icons/activity';
	import TriangleAlert from 'lucide-svelte/icons/triangle-alert';
	import ArrowUpRight from 'lucide-svelte/icons/arrow-up-right';
	import Gauge from 'lucide-svelte/icons/gauge';
	import Banknote from 'lucide-svelte/icons/banknote';
	import { cn } from '$lib/utils.js';

	interface EngineData {
		id: string;
		model: string;
		status: 'ok' | 'warning' | 'error';
		power_kw: number;
		temp: number;
		vibration: number;
		profit_rate: number;
		efficiency: number;
	}

	interface EventLog {
		id: string;
		time: string;
		level: 'info' | 'warning' | 'error';
		message: string;
		engine_id: string;
	}

	interface DashboardData {
		engines: EngineData[];
		summary: {
			totalPowerMW: number;
			efficiency: number;
			currentLoss: number;
			totalPlannedMW: number;
		};
		events: EventLog[];
	}

	let data: DashboardData | null = $state(null);
	let interval: ReturnType<typeof setInterval>;

	async function fetchData() {
		try {
			const res = await fetch(`${base}/api/status`);
			if (res.ok) {
				data = await res.json();
			}
		} catch (e) {
			console.error('Failed to fetch status', e);
		}
	}

	onMount(() => {
		fetchData();
		interval = setInterval(fetchData, 1000);
	});

	onDestroy(() => {
		if (interval) clearInterval(interval);
	});

	function getStatusColor(status: string) {
		switch (status) {
			case 'ok':
				return 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]';
			case 'warning':
				return 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]';
			case 'error':
				return 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]';
			default:
				return 'bg-slate-500';
		}
	}
</script>

{#if !data}
	<div class="flex h-[80vh] items-center justify-center">
		<div class="relative">
			<div
				class="h-12 w-12 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent"
			></div>
			<div
				class="absolute inset-0 flex items-center justify-center font-mono text-xs text-cyan-500"
			>
				...
			</div>
		</div>
	</div>
{:else}
	<div class="grid grid-cols-1 gap-6 lg:grid-cols-4">
		<!-- Main Content (Left) -->
		<div class="space-y-6 lg:col-span-3">
			<!-- Hero Stats -->
			<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
				<!-- Power Card -->
				<div class="glass-card group relative overflow-hidden rounded-xl p-6">
					<div
						class="absolute -top-4 -right-4 opacity-10 transition-transform group-hover:scale-110"
					>
						<Activity size={100} />
					</div>
					<h3 class="text-sm font-medium text-slate-400">Total Output</h3>
					<div class="mt-2 flex items-baseline gap-2">
						<span class="text-4xl font-bold tracking-tight text-white">
							<NumberTicker value={data.summary.totalPowerMW * 1000} currency="" />
						</span>
						<span class="text-sm font-medium text-slate-500">kW</span>
					</div>
					<div class="mt-4 flex items-center gap-2 text-xs text-emerald-400">
						<ArrowUpRight size={14} />
						<span>98% of Target</span>
					</div>
				</div>

				<!-- Efficiency Card -->
				<div class="glass-card group relative overflow-hidden rounded-xl p-6">
					<div
						class="absolute -top-4 -right-4 opacity-10 transition-transform group-hover:scale-110"
					>
						<Gauge size={100} />
					</div>
					<h3 class="text-sm font-medium text-slate-400">Plant Efficiency</h3>
					<div class="mt-2 flex items-baseline gap-2">
						<span class="text-4xl font-bold tracking-tight text-white">
							{data.summary.efficiency.toFixed(1)}
						</span>
						<span class="text-sm font-medium text-slate-500">%</span>
					</div>
					<!-- Gauge Bar -->
					<div class="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
						<div
							class="h-full bg-linear-to-r from-cyan-500 to-blue-500 transition-all duration-1000"
							style="width: {data.summary.efficiency}%"
						></div>
					</div>
				</div>

				<!-- Money Drain Card -->
				<div class="glass-card group relative overflow-hidden rounded-xl border-rose-500/20 p-6">
					<div
						class="absolute -top-4 -right-4 text-rose-500 opacity-10 transition-transform group-hover:scale-110"
					>
						<Banknote size={100} />
					</div>
					<h3 class="text-sm font-medium text-rose-200">Financial Loss Rate</h3>
					<div class="neon-text-red mt-2 flex items-baseline gap-2 text-rose-400">
						<span class="text-4xl font-bold tracking-tight">
							<NumberTicker value={data.summary.currentLoss} />
						</span>
					</div>
					<div class="mt-4 text-xs text-rose-300/60">
						Potential Monthly: {((data.summary.currentLoss * 24 * 30) / 1000000).toFixed(1)}M RUB
					</div>
				</div>
			</div>

			<!-- Engine Grid -->
			<h2 class="flex items-center gap-2 text-lg font-semibold text-white">
				<div class="h-2 w-2 animate-pulse rounded-full bg-cyan-400"></div>
				Live Fleet Status
			</h2>

			<div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
				{#each data.engines as engine (engine.id)}
					<a
						href="{base}/engine/{engine.id}"
						class="glass-card group relative rounded-xl p-5 transition-all hover:-translate-y-1 hover:bg-white/5"
					>
						<!-- Status Indicator -->
						<div class="absolute top-5 right-5">
							<div
								class={cn('h-3 w-3 animate-pulse rounded-full', getStatusColor(engine.status))}
							></div>
						</div>

						<div class="mb-4">
							<div class="text-lg font-bold text-white transition-colors group-hover:text-cyan-400">
								{engine.id.toUpperCase()}
							</div>
							<div class="text-xs text-slate-500">{engine.model}</div>
						</div>

						<div class="grid grid-cols-2 gap-x-2 gap-y-4 text-sm">
							<div>
								<div class="mb-1 text-xs text-slate-500">Load</div>
								<div class="font-mono text-white">
									{engine.power_kw.toFixed(0)} <span class="text-xs text-slate-500">kW</span>
								</div>
							</div>
							<div>
								<div class="mb-1 text-xs text-slate-500">Profitability</div>
								<div
									class={cn(
										'font-mono font-medium',
										engine.profit_rate > 0 ? 'text-emerald-400' : 'text-rose-400'
									)}
								>
									{engine.profit_rate > 0 ? '+' : ''}{Math.round(engine.profit_rate)}
									<span class="text-xs opacity-50">R/h</span>
								</div>
							</div>
							<div>
								<div class="mb-1 text-xs text-slate-500">Temp</div>
								<div
									class={cn(
										'font-mono',
										engine.temp > 500 ? 'animate-pulse text-rose-400' : 'text-slate-300'
									)}
								>
									{engine.temp.toFixed(0)}°C
								</div>
							</div>
							<div>
								<div class="mb-1 text-xs text-slate-500">Vibration</div>
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
					Live Events
				</h3>
			</div>

			<div class="flex-1 space-y-3 overflow-y-auto p-4">
				{#each data.events as event (event.id)}
					<div class="flex gap-3 rounded-lg border border-white/5 bg-white/5 p-3 text-sm">
						<div class="mt-0.5 shrink-0">
							{#if event.level === 'error'}
								<div
									class="h-2 w-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]"
								></div>
							{:else if event.level === 'warning'}
								<div
									class="h-2 w-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]"
								></div>
							{:else}
								<div class="h-2 w-2 rounded-full bg-blue-500"></div>
							{/if}
						</div>
						<div>
							<div class="mb-1 text-xs text-slate-500">
								{new Date(event.time).toLocaleTimeString()}
							</div>
							<div class="leading-snug text-slate-200">
								{event.message}
							</div>
						</div>
					</div>
				{/each}

				{#if data.events.length === 0}
					<div class="py-10 text-center text-sm text-slate-600">No events logged yet.</div>
				{/if}
			</div>
		</div>
	</div>
{/if}
