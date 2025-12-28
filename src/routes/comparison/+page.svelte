<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { base } from '$app/paths';
	import { Card, Badge, Button } from '$lib/components/ui/index.js';
	import { cn } from '$lib/utils.js';
	import BarChart from 'lucide-svelte/icons/bar-chart-3';
	import Plus from 'lucide-svelte/icons/plus';
	import X from 'lucide-svelte/icons/x';
	import Activity from 'lucide-svelte/icons/activity';
	import Thermometer from 'lucide-svelte/icons/thermometer';
	import Gauge from 'lucide-svelte/icons/gauge';
	import Zap from 'lucide-svelte/icons/zap';
	import type { EngineWithMetrics } from '$lib/types/index.js';

	let engines: EngineWithMetrics[] = $state([]);
	let selectedEngines: string[] = $state(['gpu-1', 'gpu-2']);
	let loading = $state(true);
	let chartContainer = $state<HTMLDivElement>();
	let chartInstance: any;

	async function loadData() {
		loading = true;
		try {
			const res = await fetch(`${base}/api/status`);
			if (res.ok) {
				const data = await res.json();
				engines = data.engines;
				updateChart();
			}
		} finally {
			loading = false;
		}
	}

	async function updateChart() {
		if (!chartContainer || selectedEngines.length === 0) return;

		const echarts = await import('echarts');
		if (!chartInstance) {
			chartInstance = echarts.init(chartContainer);
		}

		const selected = engines.filter((e) => selectedEngines.includes(e.id));

		chartInstance.setOption({
			tooltip: {
				trigger: 'axis',
				axisPointer: { type: 'shadow' },
				backgroundColor: 'rgba(15, 23, 42, 0.9)',
				borderColor: '#334155',
				textStyle: { color: '#f8fafc' }
			},
			legend: {
				data: selected.map((e) => e.id.toUpperCase()),
				textStyle: { color: '#94a3b8' }
			},
			grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
			xAxis: {
				type: 'category',
				data: ['Power (kW)', 'Temp (°C)', 'Vibration (mm/s)', 'Efficiency (%)'],
				axisLabel: { color: '#64748b' }
			},
			yAxis: {
				type: 'value',
				axisLabel: { color: '#64748b' },
				splitLine: { lineStyle: { color: '#1e293b' } }
			},
			series: selected.map((engine, i) => ({
				name: engine.id.toUpperCase(),
				type: 'bar',
				data: [
					engine.power_kw,
					engine.temp,
					engine.vibration * 100, // Scale for visibility
					(engine.power_kw / 1500) * 100 // Mock efficiency
				],
				itemStyle: {
					color: ['#06b6d4', '#10b981', '#f59e0b', '#8b5cf6'][i % 4]
				}
			}))
		});
	}

	function toggleEngine(engineId: string) {
		if (selectedEngines.includes(engineId)) {
			if (selectedEngines.length > 1) {
				selectedEngines = selectedEngines.filter((e) => e !== engineId);
			}
		} else if (selectedEngines.length < 4) {
			selectedEngines = [...selectedEngines, engineId];
		}
		updateChart();
	}

	onMount(() => {
		loadData();
		window.addEventListener('resize', handleResize);
	});

	onDestroy(() => {
		chartInstance?.dispose();
		if (typeof window !== 'undefined') {
			window.removeEventListener('resize', handleResize);
		}
	});

	function handleResize() {
		chartInstance?.resize();
	}

	const selectedEngineData = $derived(engines.filter((e) => selectedEngines.includes(e.id)));

	const fleetAverage = $derived.by(() => {
		if (engines.length === 0) return { power: 0, temp: 0, vibration: 0 };
		return {
			power: engines.reduce((sum, e) => sum + e.power_kw, 0) / engines.length,
			temp: engines.reduce((sum, e) => sum + e.temp, 0) / engines.length,
			vibration: engines.reduce((sum, e) => sum + e.vibration, 0) / engines.length
		};
	});
</script>

<div class="mx-auto max-w-6xl space-y-6">
	<!-- Header -->
	<div>
		<h1 class="flex items-center gap-3 text-2xl font-bold text-white">
			<BarChart class="h-7 w-7 text-cyan-400" />
			Engine Comparison
		</h1>
		<p class="mt-1 text-sm text-slate-400">Compare performance metrics across engines</p>
	</div>

	<!-- Engine Selection -->
	<Card class="p-4">
		<div class="mb-3 text-sm text-slate-400">Select engines to compare (max 4):</div>
		<div class="flex flex-wrap gap-2">
			{#each engines as engine}
				<button
					type="button"
					class={cn(
						'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition',
						selectedEngines.includes(engine.id)
							? 'bg-cyan-500 text-white'
							: 'bg-slate-800 text-slate-400 hover:bg-slate-700'
					)}
					onclick={() => toggleEngine(engine.id)}
				>
					{engine.id.toUpperCase()}
					{#if selectedEngines.includes(engine.id)}
						<X class="h-3 w-3" />
					{:else}
						<Plus class="h-3 w-3" />
					{/if}
				</button>
			{/each}
		</div>
	</Card>

	<!-- Comparison Chart -->
	<Card>
		<h3 class="mb-4 text-lg font-semibold text-white">Performance Comparison</h3>
		<div class="h-80 w-full" bind:this={chartContainer}></div>
	</Card>

	<!-- Metrics Table -->
	<Card class="overflow-hidden p-0">
		<div class="overflow-x-auto">
			<table class="w-full text-left text-sm">
				<thead class="border-b border-white/5 bg-slate-800/50">
					<tr>
						<th class="p-4 font-semibold text-slate-300">Metric</th>
						{#each selectedEngineData as engine}
							<th class="p-4 font-semibold text-slate-300">{engine.id.toUpperCase()}</th>
						{/each}
						<th class="p-4 font-semibold text-slate-400">Fleet Avg</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-white/5">
					<tr class="hover:bg-white/5">
						<td class="p-4">
							<div class="flex items-center gap-2 text-slate-300">
								<Activity class="h-4 w-4 text-cyan-400" />
								Power Output
							</div>
						</td>
						{#each selectedEngineData as engine}
							<td class="p-4 font-mono text-white">{engine.power_kw.toFixed(0)} kW</td>
						{/each}
						<td class="p-4 font-mono text-slate-400">{fleetAverage.power.toFixed(0)} kW</td>
					</tr>
					<tr class="hover:bg-white/5">
						<td class="p-4">
							<div class="flex items-center gap-2 text-slate-300">
								<Thermometer class="h-4 w-4 text-rose-400" />
								Exhaust Temp
							</div>
						</td>
						{#each selectedEngineData as engine}
							<td class="p-4 font-mono {engine.temp > 500 ? 'text-rose-400' : 'text-white'}">
								{engine.temp.toFixed(0)}°C
							</td>
						{/each}
						<td class="p-4 font-mono text-slate-400">{fleetAverage.temp.toFixed(0)}°C</td>
					</tr>
					<tr class="hover:bg-white/5">
						<td class="p-4">
							<div class="flex items-center gap-2 text-slate-300">
								<Gauge class="h-4 w-4 text-amber-400" />
								Vibration
							</div>
						</td>
						{#each selectedEngineData as engine}
							<td class="p-4 font-mono {engine.vibration > 8 ? 'text-amber-400' : 'text-white'}">
								{engine.vibration.toFixed(1)} mm/s
							</td>
						{/each}
						<td class="p-4 font-mono text-slate-400">{fleetAverage.vibration.toFixed(1)} mm/s</td>
					</tr>
					<tr class="hover:bg-white/5">
						<td class="p-4">
							<div class="flex items-center gap-2 text-slate-300">
								<Zap class="h-4 w-4 text-emerald-400" />
								Profitability
							</div>
						</td>
						{#each selectedEngineData as engine}
							<td
								class="p-4 font-mono {engine.profit_rate > 0
									? 'text-emerald-400'
									: 'text-rose-400'}"
							>
								{engine.profit_rate > 0 ? '+' : ''}{engine.profit_rate.toFixed(0)} ₽/h
							</td>
						{/each}
						<td class="p-4 font-mono text-slate-400">
							{(engines.reduce((sum, e) => sum + e.profit_rate, 0) / engines.length).toFixed(0)} ₽/h
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	</Card>

	<!-- Ranking -->
	<Card>
		<h3 class="mb-4 text-lg font-semibold text-white">Efficiency Ranking</h3>
		<div class="space-y-3">
			{#each [...engines].sort((a, b) => b.profit_rate - a.profit_rate) as engine, i}
				<div class="flex items-center gap-4 rounded-lg bg-slate-800/50 p-3">
					<div
						class={cn(
							'flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold',
							i === 0
								? 'bg-amber-500 text-black'
								: i === 1
									? 'bg-slate-400 text-black'
									: i === 2
										? 'bg-amber-700 text-white'
										: 'bg-slate-700 text-slate-400'
						)}
					>
						{i + 1}
					</div>
					<div class="flex-1">
						<div class="font-medium text-white">{engine.id.toUpperCase()}</div>
						<div class="text-xs text-slate-400">{engine.model}</div>
					</div>
					<div class="text-right">
						<div class="font-mono text-lg text-emerald-400">
							+{engine.profit_rate.toFixed(0)} ₽/h
						</div>
						<div class="text-xs text-slate-500">{engine.power_kw.toFixed(0)} kW</div>
					</div>
				</div>
			{/each}
		</div>
	</Card>
</div>
