<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { currency as currencyState } from '$lib/state/currency.svelte.js';
	import { Card, Badge } from '$lib/components/ui/index.js';
	import TrendingUp from 'lucide-svelte/icons/trending-up';
	import Fuel from 'lucide-svelte/icons/fuel';
	import Wrench from 'lucide-svelte/icons/wrench';
	import Users from 'lucide-svelte/icons/users';
	import Building from 'lucide-svelte/icons/building-2';
	import Zap from 'lucide-svelte/icons/zap';
	import Calendar from 'lucide-svelte/icons/calendar';
	import {
		getCostBreakdown,
		getMonthlyTrend,
		type CostBreakdown,
		type MonthlyTrend
	} from '$lib/services/economics.service.js';
	import { Skeleton } from '$lib/components/ui/index.js';

	let costBreakdown: CostBreakdown | null = $state(null);
	let monthlyTrend: MonthlyTrend[] = $state([]);
	let loading = $state(true);

	// Chart containers
	let pieChartEl = $state<HTMLDivElement>();
	let barChartEl = $state<HTMLDivElement>();
	type EChartsInstance = {
		dispose: () => void;
		resize: () => void;
		setOption: (option: unknown) => void;
	};
	let pieChartInstance: EChartsInstance | null = null;
	let barChartInstance: EChartsInstance | null = null;

	// type IconComponent = typeof import('lucide-svelte/icons/fuel').default;
	const costConfig = $derived.by(() => ({
		gas: { label: $_('economics.gasShare'), color: '#f97316', icon: Fuel },
		depreciation: { label: $_('economics.depreciation'), color: '#3b82f6', icon: Building },
		spare_parts: { label: $_('economics.spareParts'), color: '#10b981', icon: Wrench },
		labor: { label: $_('economics.labor'), color: '#a855f7', icon: Users },
		other: { label: $_('economics.other'), color: '#64748b', icon: TrendingUp }
	}));

	onMount(async () => {
		try {
			const [breakdown, trend] = await Promise.all([getCostBreakdown(), getMonthlyTrend()]);
			costBreakdown = breakdown;
			monthlyTrend = trend;
			loading = false;

			// Initialize Charts
			const echarts = await import('echarts');

			if (pieChartEl && costBreakdown) {
				const chart = echarts.init(pieChartEl);
				pieChartInstance = chart;
				initPieChart(chart, costBreakdown);
			}

			if (barChartEl && monthlyTrend.length > 0) {
				const chart = echarts.init(barChartEl);
				barChartInstance = chart;
				initBarChart(chart, monthlyTrend);
			}

			window.addEventListener('resize', handleResize);
		} catch (e) {
			console.error(e);
		}
	});

	onDestroy(() => {
		if (typeof window !== 'undefined') {
			window.removeEventListener('resize', handleResize);
		}
		pieChartInstance?.dispose();
		barChartInstance?.dispose();
	});

	function handleResize() {
		pieChartInstance?.resize();
		barChartInstance?.resize();
	}

	function initPieChart(instance: EChartsInstance, data: CostBreakdown) {
		const chartData = Object.entries(costConfig).map(([key, config]) => ({
			value: currencyState.convert(data[key as keyof CostBreakdown]),
			name: config.label,
			itemStyle: { color: config.color }
		}));

		instance.setOption({
			tooltip: {
				trigger: 'item',
				formatter: `{b}: {c} ${currencyState.info.symbol} ({d}%)`,
				backgroundColor: 'rgba(15, 23, 42, 0.9)',
				borderColor: '#334155',
				textStyle: { color: '#f8fafc' }
			},
			series: [
				{
					name: 'Cost Structure',
					type: 'pie',
					radius: ['50%', '75%'],
					avoidLabelOverlap: false,
					itemStyle: {
						borderRadius: 5,
						borderColor: '#0f172a', // slate-950
						borderWidth: 2
					},
					label: {
						show: false,
						position: 'center'
					},
					emphasis: {
						label: {
							show: true,
							fontSize: 20,
							fontWeight: 'bold',
							color: '#fff',
							formatter: '{b}\n{d}%'
						}
					},
					labelLine: {
						show: false
					},
					data: chartData
				}
			]
		});
	}

	function initBarChart(instance: EChartsInstance, data: MonthlyTrend[]) {
		const costLabel = `${$_('economics.costLabel')} (${currencyState.info.symbol})`;
		const productionLabel = $_('economics.productionLabel');

		instance.setOption({
			tooltip: {
				trigger: 'axis',
				axisPointer: { type: 'cross' },
				backgroundColor: 'rgba(15, 23, 42, 0.9)',
				borderColor: '#334155',
				textStyle: { color: '#f8fafc' }
			},
			grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
			legend: {
				data: [costLabel, productionLabel],
				textStyle: { color: '#94a3b8' }
			},
			xAxis: {
				type: 'category',
				data: data.map((d) => d.month),
				axisLabel: { color: '#cbd5e1' }
			},
			yAxis: [
				{
					type: 'value',
					name: currencyState.info.symbol,
					position: 'left',
					axisLabel: { color: '#cbd5e1' },
					splitLine: { lineStyle: { color: '#334155' } }
				},
				{
					type: 'value',
					name: $_('units.mwh'),
					position: 'right',
					axisLabel: { color: '#cbd5e1' },
					splitLine: { show: false }
				}
			],
			series: [
				{
					name: costLabel,
					type: 'bar',
					data: data.map((d) => currencyState.convert(d.cost)),
					itemStyle: { color: '#06b6d4' } // cyan-500
				},
				{
					name: productionLabel,
					type: 'line',
					yAxisIndex: 1,
					data: data.map((d) => d.production),
					itemStyle: { color: '#10b981' }, // emerald-500
					smooth: true,
					areaStyle: {
						color: {
							type: 'linear',
							x: 0,
							y: 0,
							x2: 0,
							y2: 1,
							colorStops: [
								{ offset: 0, color: 'rgba(16, 185, 129, 0.5)' },
								{ offset: 1, color: 'rgba(16, 185, 129, 0)' }
							]
						}
					}
				}
			]
		});
	}
</script>

<div class="mx-auto max-w-6xl space-y-6">
	<!-- Header -->
	<div>
		<h1 class="flex items-center gap-3 text-2xl font-bold text-white">
			<TrendingUp class="h-7 w-7 text-cyan-400" />
			{$_('economics.title')}
		</h1>
		<p class="mt-1 text-sm text-slate-400">{$_('economics.subtitle')}</p>
	</div>

	{#if loading || !costBreakdown}
		<div class="grid gap-6 md:grid-cols-3">
			<Skeleton class="h-32 w-full" />
			<Skeleton class="h-32 w-full" />
			<Skeleton class="h-32 w-full" />
		</div>
		<div class="grid gap-6 lg:grid-cols-2">
			<Skeleton class="h-96 w-full" />
			<Skeleton class="h-96 w-full" />
		</div>
	{:else}
		<!-- Main KPI -->
		<div class="grid gap-6 md:grid-cols-3">
			<Card class="relative overflow-hidden">
				<div class="absolute -top-4 -right-4 opacity-10">
					<Zap size={100} />
				</div>
				<h3 class="text-sm font-medium text-slate-400">
					{$_('economics.costPerKwh')}
				</h3>
				<div class="mt-2 flex items-baseline gap-2">
					<span class="text-4xl font-bold text-white"
						>{currencyState.convert(costBreakdown.cost_per_kwh).toFixed(2)}</span
					>
					<span class="text-lg text-slate-500">{currencyState.info.symbol}/{$_('units.kwh')}</span>
				</div>
				<div class="mt-4 text-xs text-slate-500">{$_('economics.averageLastMonth')}</div>
			</Card>

			<Card>
				<h3 class="text-sm font-medium text-slate-400">{$_('economics.monthlyProduction')}</h3>
				<div class="mt-2 flex items-baseline gap-2">
					<span class="text-4xl font-bold text-emerald-400">2,300</span>
					<span class="text-lg text-slate-500">{$_('units.mwh')}</span>
				</div>
				<div class="mt-4 flex items-center gap-2 text-xs text-emerald-400">
					<TrendingUp class="h-4 w-4" />
					+2.2% {$_('economics.vsLastMonth')}
				</div>
			</Card>

			<Card>
				<h3 class="text-sm font-medium text-slate-400">{$_('economics.totalCosts')}</h3>
				<div class="mt-2 flex items-baseline gap-2">
					<span class="text-4xl font-bold text-amber-400"
						>{(currencyState.convert(11500000) / 1000000).toFixed(1)}</span
					>
					<span class="text-lg text-slate-500">M {currencyState.info.symbol}</span>
				</div>
				<div class="mt-4 flex items-center gap-2 text-xs text-rose-400">
					<TrendingUp class="h-4 w-4 rotate-180" />
					+4.0% {$_('economics.vsLastMonth')}
				</div>
			</Card>
		</div>

		<div class="grid gap-6 lg:grid-cols-2">
			<!-- Cost Structure Pie Chart (Redesigned) -->
			<Card class="col-span-1 flex flex-col p-6 lg:col-span-2 xl:col-span-1">
				<div class="mb-6 flex items-center justify-between">
					<h3 class="text-lg font-semibold text-white">
						{$_('economics.costStructure')}
					</h3>
					<Badge class="border-slate-700 bg-slate-900/50 pl-2 text-slate-400">
						<Calendar class="mr-1 h-3 w-3" />
						Dec 2024
					</Badge>
				</div>

				<div class="grid grid-cols-1 items-center gap-6 md:grid-cols-2">
					<!-- Chart -->
					<div class="h-64 w-full" bind:this={pieChartEl}></div>

					<!-- Legend -->
					<div class="space-y-3">
						{#each Object.entries(costConfig) as [key, config] (key)}
							{@const val = costBreakdown[key as keyof CostBreakdown]}
							{@const Icon = config.icon}
							{#if typeof val === 'number'}
								<div
									class="flex items-center justify-between rounded-lg bg-slate-800/50 px-3 py-2 text-sm"
								>
									<div class="flex items-center gap-3">
										<div class="rounded p-1" style="background-color: {config.color}20">
											<Icon class="h-4 w-4" style="color: {config.color}" />
										</div>
										<span class="text-slate-300">{config.label}</span>
									</div>
									<div class="text-right">
										<div class="font-mono text-white">
											{currencyState.convert(val).toFixed(2)}
											{currencyState.info.symbol}
										</div>
										<div class="text-[10px] text-slate-500">
											{((val / costBreakdown.total) * 100).toFixed(0)}%
										</div>
									</div>
								</div>
							{/if}
						{/each}
					</div>
				</div>
			</Card>

			<!-- Cost Breakdown Details -->
			<Card>
				<h3 class="mb-6 text-lg font-semibold text-white">{$_('economics.costDetails')}</h3>

				<div class="space-y-4">
					{#each Object.entries(costConfig) as [key, config] (key)}
						{@const val = costBreakdown[key as keyof CostBreakdown]}
						{@const Icon = config.icon}
						{#if typeof val === 'number'}
							<div class="rounded-lg bg-slate-800/50 p-4">
								<div class="mb-2 flex items-center justify-between">
									<div class="flex items-center gap-3">
										<div class="rounded-lg p-2" style="background-color: {config.color}20">
											<Icon class="h-5 w-5" style="color: {config.color}" />
										</div>
										<div>
											<div class="font-medium text-white">{config.label}</div>
											<div class="text-xs text-slate-400">
												{((val / costBreakdown.total) * 100).toFixed(1)}% {$_(
													'economics.ofTotalCosts'
												)}
											</div>
										</div>
									</div>
									<div class="text-right">
										<div class="font-mono text-lg text-white">
											{currencyState.convert(val).toFixed(2)}
										</div>
										<div class="text-xs text-slate-400">
											{currencyState.info.symbol}/{$_('units.kwh')}
										</div>
									</div>
								</div>
								<div class="h-1.5 overflow-hidden rounded-full bg-slate-700">
									<div
										class="h-full transition-all duration-1000"
										style="width: {(val / costBreakdown.total) *
											100}%; background-color: {config.color}"
									></div>
								</div>
							</div>
						{/if}
					{/each}
				</div>
			</Card>
		</div>

		<!-- Monthly Trend -->
		<Card>
			<h3 class="mb-6 text-lg font-semibold text-white">
				{$_('economics.monthlyTrend')}
			</h3>

			<div class="h-80 w-full" bind:this={barChartEl}></div>
		</Card>
	{/if}
</div>
