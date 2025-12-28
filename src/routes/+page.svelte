<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { base } from '$app/paths';

	interface EngineData {
		id: string;
		model: string;
		status: 'ok' | 'warning' | 'error';
		power_kw: number;
		temp: number;
		gas: number;
	}

	interface DashboardData {
		engines: EngineData[];
		summary: {
			totalPowerMW: number;
			efficiency: number;
			currentLoss: number;
			totalPlannedMW: number;
		};
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

	function getStatusStyles(status: string) {
		switch (status) {
			case 'ok':
				return {
					badge: 'bg-green-500 text-white',
					border: 'border-l-4 border-l-green-500',
					glow: 'group-hover:shadow-green-500/20'
				};
			case 'warning':
				return {
					badge: 'bg-yellow-500 text-white animate-pulse',
					border: 'border-l-4 border-l-yellow-500',
					glow: 'group-hover:shadow-yellow-500/20'
				};
			case 'error':
				return {
					badge: 'bg-red-500 text-white animate-pulse',
					border: 'border-l-4 border-l-red-500',
					glow: 'group-hover:shadow-red-500/20'
				};
			default:
				return {
					badge: 'bg-slate-500 text-white',
					border: 'border-l-4 border-l-slate-500',
					glow: 'group-hover:shadow-slate-500/20'
				};
		}
	}
</script>

{#if !data}
	<div class="flex h-64 items-center justify-center">
		<div class="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
	</div>
{:else}
	<!-- Summary Cards -->
	<div class="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
		<div
			class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800"
		>
			<h3 class="mb-1 text-sm font-medium text-slate-500 dark:text-slate-400">Total Power</h3>
			<div class="flex items-baseline gap-2">
				<span class="text-3xl font-bold">{data.summary.totalPowerMW.toFixed(2)}</span>
				<span class="text-sm text-slate-500">MW</span>
			</div>
			<div class="mt-2 text-xs text-slate-400">
				Target: {data.summary.totalPlannedMW.toFixed(1)} MW
			</div>
		</div>

		<div
			class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800"
		>
			<h3 class="mb-1 text-sm font-medium text-slate-500 dark:text-slate-400">Efficiency</h3>
			<div class="flex items-baseline gap-2">
				<span class="text-3xl font-bold">{data.summary.efficiency.toFixed(1)}</span>
				<span class="text-sm text-slate-500">%</span>
			</div>
			<div class="mt-3 h-1.5 w-full rounded-full bg-slate-200">
				<div
					class="h-1.5 rounded-full bg-blue-600 transition-all duration-500"
					style="width: {Math.min(data.summary.efficiency, 100)}%"
				></div>
			</div>
		</div>

		<div
			class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800"
		>
			<h3 class="mb-1 text-sm font-medium text-slate-500 dark:text-slate-400">
				Current Financial Loss
			</h3>
			<div class="flex items-baseline gap-2">
				<span
					class="text-3xl font-bold {data.summary.currentLoss > 0
						? 'text-red-500'
						: 'text-slate-900 dark:text-white'}"
				>
					{data.summary.currentLoss.toFixed(0)}
				</span>
				<span class="text-sm text-slate-500">RUB/h</span>
			</div>
			<div class="mt-2 text-xs text-slate-400">Based on deficit from plan</div>
		</div>
	</div>

	<!-- Engine Grid -->
	<h2 class="mb-4 text-lg font-semibold text-slate-800 dark:text-white">Fleet Status</h2>
	<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
		{#each data.engines as engine (engine.id)}
			{@const styles = getStatusStyles(engine.status)}
			<a href="{base}/engine/{engine.id}" class="group block">
				<div
					class="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg dark:border-slate-700 dark:bg-slate-800 {styles.border} {styles.glow}"
				>
					<div class="mb-4 flex items-start justify-between">
						<div>
							<h3 class="text-lg font-bold transition-colors group-hover:text-blue-600">
								{engine.id.toUpperCase()}
							</h3>
							<p class="text-xs text-slate-500">{engine.model}</p>
						</div>
						<span class="rounded-full px-2 py-1 text-xs font-bold uppercase {styles.badge}">
							{engine.status}
						</span>
					</div>

					<div class="grid grid-cols-2 gap-4">
						<div>
							<div class="mb-1 text-xs text-slate-500">Load</div>
							<div class="font-mono font-medium">
								{engine.power_kw.toFixed(0)} <span class="text-xs text-slate-400">kW</span>
							</div>
						</div>
						<div>
							<div class="mb-1 text-xs text-slate-500">Temp</div>
							<div class="font-mono font-medium {engine.temp > 500 ? 'text-red-500' : ''}">
								{engine.temp.toFixed(1)} <span class="text-xs text-slate-400">°C</span>
							</div>
						</div>
					</div>
				</div>
			</a>
		{/each}
	</div>
{/if}
