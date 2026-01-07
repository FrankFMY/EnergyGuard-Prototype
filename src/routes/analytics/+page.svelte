<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { _, isLoading } from 'svelte-i18n';
	import { Card, Badge, Button } from '$lib/components/ui/index.js';
	import TrendingUp from 'lucide-svelte/icons/trending-up';
	import DollarSign from 'lucide-svelte/icons/dollar-sign';
	import Clock from 'lucide-svelte/icons/clock';
	import AlertTriangle from 'lucide-svelte/icons/alert-triangle';
	import CheckCircle from 'lucide-svelte/icons/check-circle';
	import Target from 'lucide-svelte/icons/target';
	import PiggyBank from 'lucide-svelte/icons/piggy-bank';
	import Zap from 'lucide-svelte/icons/zap';
	import Calendar from 'lucide-svelte/icons/calendar';
	import ArrowUpRight from 'lucide-svelte/icons/arrow-up-right';

	// Business metrics
	const metrics = {
		totalSavings: 2847500,
		preventedDowntime: 127,
		avgDowntimeCost: 45000,
		predictedSavingsNextMonth: 380000,
		oeeImprovement: 8.5,
		maintenanceCostReduction: 23,
		alertsPreventedFailures: 14,
		roiPercent: 340
	};

	// Monthly savings data
	const monthlySavings = [
		{ month: 'Jul', prevented: 180000, maintenance: 45000, efficiency: 32000 },
		{ month: 'Aug', prevented: 225000, maintenance: 52000, efficiency: 41000 },
		{ month: 'Sep', prevented: 270000, maintenance: 48000, efficiency: 38000 },
		{ month: 'Oct', prevented: 315000, maintenance: 61000, efficiency: 45000 },
		{ month: 'Nov', prevented: 405000, maintenance: 58000, efficiency: 52000 },
		{ month: 'Dec', prevented: 480000, maintenance: 72000, efficiency: 68000 }
	];

	// Downtime analysis
	const downtimeAnalysis = [
		{ reasonKey: 'overheat', hours: 12, cost: 540000, prevented: 8, color: '#f43f5e' },
		{ reasonKey: 'vibration', hours: 8, cost: 360000, prevented: 5, color: '#f59e0b' },
		{ reasonKey: 'gasPressure', hours: 5, cost: 225000, prevented: 3, color: '#06b6d4' },
		{ reasonKey: 'scheduledMaintenance', hours: 24, cost: 1080000, prevented: 0, color: '#10b981' }
	];

	type EChartsInstance = {
		dispose: () => void;
		resize: () => void;
		setOption: (option: unknown) => void;
	};

	let savingsChartEl = $state<HTMLDivElement>();
	let waterfallChartEl = $state<HTMLDivElement>();
	let downtimeChartEl = $state<HTMLDivElement>();
	let roiChartEl = $state<HTMLDivElement>();
	let savingsChart: EChartsInstance | null = null;
	let waterfallChart: EChartsInstance | null = null;
	let downtimeChart: EChartsInstance | null = null;
	let roiChart: EChartsInstance | null = null;

	onMount(async () => {
		const echarts = await import('echarts');

		// ═══════════════════════════════════════════════════════════════
		// WATERFALL CHART (Financial Bridge)
		// Shows how we go from target revenue to actual profit
		// ═══════════════════════════════════════════════════════════════
		if (waterfallChartEl) {
			const chart = echarts.init(waterfallChartEl);
			waterfallChart = chart;

			// Data structure for waterfall
			const data = [
				{ name: 'Целевая\nвыручка', value: 5000000, type: 'total' },
				{ name: 'Потери\nКПД (газ)', value: -450000, type: 'loss' },
				{ name: 'Внеплановые\nпростои', value: -320000, type: 'loss' },
				{ name: 'Затраты\nна ТО', value: -280000, type: 'loss' },
				{ name: 'Прочие\nиздержки', value: -150000, type: 'loss' },
				{ name: 'Фактическая\nприбыль', value: 3800000, type: 'total' }
			];

			// Calculate stacked bar data
			let runningTotal = 0;
			const placeholder: number[] = [];
			const income: (number | string)[] = [];
			const expense: (number | string)[] = [];

			data.forEach((item, i) => {
				if (item.type === 'total') {
					placeholder.push(0);
					income.push(item.value);
					expense.push('-');
					runningTotal = i === 0 ? item.value : runningTotal;
				} else {
					const loss = Math.abs(item.value);
					runningTotal -= loss;
					placeholder.push(runningTotal);
					income.push('-');
					expense.push(loss);
				}
			});

			// Bridge connector line (shows the flow)
			const bridgeLine = [5000000, 5000000, 4550000, 4230000, 3950000, 3800000];

			chart.setOption({
				tooltip: {
					trigger: 'axis',
					axisPointer: { type: 'shadow' },
					backgroundColor: 'rgba(15, 23, 42, 0.95)',
					borderColor: '#334155',
					textStyle: { color: '#f8fafc', fontSize: 12 },
					formatter: (params: unknown) => {
						const p = Array.isArray(params) ? params[0] : (params as { dataIndex: number });
						const idx = p.dataIndex;
						const item = data[idx];
						const color = item.type === 'loss' ? '#f43f5e' : '#06b6d4';
						const sign = item.value < 0 ? '' : '+';
						return `<b>${item.name}</b><br/>
							<span style="color:${color};font-size:14px;font-weight:bold">
								${sign}${item.value.toLocaleString('ru-RU')} ₽
							</span>`;
					}
				},
				grid: { left: 20, right: 20, bottom: 20, top: 20 },
				xAxis: {
					type: 'category',
					data: data.map((d) => d.name),
					axisLabel: {
						color: '#94a3b8',
						fontSize: 10,
						interval: 0,
						lineHeight: 14
					},
					axisLine: { lineStyle: { color: '#334155' } }
				},
				yAxis: {
					type: 'value',
					axisLabel: {
						color: '#64748b',
						formatter: (v: number) => (v / 1000000).toFixed(1) + 'M'
					},
					splitLine: { lineStyle: { color: '#1e293b', type: 'dashed' } }
				},
				series: [
					// Invisible placeholder (creates the "floating" effect)
					{
						name: 'Base',
						type: 'bar',
						stack: 'waterfall',
						silent: true,
						itemStyle: { color: 'transparent' },
						data: placeholder
					},
					// Income bars (cyan)
					{
						name: 'Доход',
						type: 'bar',
						stack: 'waterfall',
						itemStyle: {
							color: '#06b6d4',
							borderRadius: [4, 4, 0, 0]
						},
						label: {
							show: true,
							position: 'top',
							color: '#06b6d4',
							fontWeight: 'bold',
							fontSize: 11,
							formatter: (p: { value: number | string }) =>
								p.value !== '-' ? ((p.value as number) / 1000000).toFixed(1) + 'M ₽' : ''
						},
						data: income
					},
					// Expense bars (red) - these "hang" from the bridge
					{
						name: 'Расход',
						type: 'bar',
						stack: 'waterfall',
						itemStyle: {
							color: '#f43f5e',
							borderRadius: [4, 4, 4, 4]
						},
						label: {
							show: true,
							position: 'inside',
							color: '#fff',
							fontWeight: 'bold',
							fontSize: 10,
							formatter: (p: { value: number | string }) =>
								p.value !== '-' ? '-' + ((p.value as number) / 1000).toFixed(0) + 'k' : ''
						},
						data: expense
					},
					// Bridge connector line
					{
						name: 'Мост',
						type: 'line',
						step: 'end',
						symbol: 'none',
						silent: true,
						lineStyle: {
							color: '#475569',
							width: 2,
							type: [5, 3] // dashed
						},
						z: 1,
						data: bridgeLine
					}
				]
			});
		}

		// Savings trend chart
		if (savingsChartEl) {
			const chart = echarts.init(savingsChartEl);
			savingsChart = chart;
			chart.setOption({
				tooltip: {
					trigger: 'axis',
					backgroundColor: 'rgba(15, 23, 42, 0.95)',
					borderColor: '#334155',
					textStyle: { color: '#f8fafc' }
				},
				legend: {
					data: [
						$_('analytics.categories.preventedDowntime'),
						$_('analytics.categories.maintenanceSavings'),
						$_('analytics.categories.efficiency')
					],
					textStyle: { color: '#94a3b8' },
					bottom: 0
				},
				grid: { left: '3%', right: '4%', bottom: '15%', top: '10%', containLabel: true },
				xAxis: {
					type: 'category',
					data: monthlySavings.map((m) => m.month),
					axisLabel: { color: '#64748b' }
				},
				yAxis: {
					type: 'value',
					axisLabel: {
						color: '#64748b',
						formatter: (v: number) => (v / 1000).toFixed(0) + 'K'
					},
					splitLine: { lineStyle: { color: '#1e293b' } }
				},
				series: [
					{
						name: $_('analytics.categories.preventedDowntime'),
						type: 'bar',
						stack: 'total',
						data: monthlySavings.map((m) => m.prevented),
						itemStyle: { color: '#10b981' }
					},
					{
						name: $_('analytics.categories.maintenanceSavings'),
						type: 'bar',
						stack: 'total',
						data: monthlySavings.map((m) => m.maintenance),
						itemStyle: { color: '#06b6d4' }
					},
					{
						name: $_('analytics.categories.efficiency'),
						type: 'bar',
						stack: 'total',
						data: monthlySavings.map((m) => m.efficiency),
						itemStyle: { color: '#8b5cf6' }
					}
				]
			});
		}

		// Downtime pie chart
		if (downtimeChartEl) {
			const chart = echarts.init(downtimeChartEl);
			downtimeChart = chart;
			chart.setOption({
				tooltip: {
					trigger: 'item',
					backgroundColor: 'rgba(15, 23, 42, 0.95)',
					borderColor: '#334155',
					textStyle: { color: '#f8fafc' },
					formatter: '{b}: {c} h ({d}%)'
				},
				series: [
					{
						type: 'pie',
						radius: ['50%', '75%'],
						avoidLabelOverlap: false,
						itemStyle: { borderRadius: 4, borderColor: '#0f172a', borderWidth: 2 },
						label: { show: false },
						data: downtimeAnalysis.map((d) => ({
							name: $_(`analytics.reasons.${d.reasonKey}`),
							value: d.hours,
							itemStyle: { color: d.color }
						}))
					}
				]
			});
		}

		// ROI gauge
		if (roiChartEl) {
			const chart = echarts.init(roiChartEl);
			roiChart = chart;
			chart.setOption({
				series: [
					{
						type: 'gauge',
						startAngle: 200,
						endAngle: -20,
						min: 0,
						max: 500,
						splitNumber: 5,
						pointer: { show: false },
						progress: {
							show: true,
							width: 20,
							itemStyle: {
								color: {
									type: 'linear',
									x: 0,
									y: 0,
									x2: 1,
									y2: 0,
									colorStops: [
										{ offset: 0, color: '#06b6d4' },
										{ offset: 1, color: '#10b981' }
									]
								}
							}
						},
						axisLine: { lineStyle: { width: 20, color: [[1, '#1e293b']] } },
						axisTick: { show: false },
						splitLine: { show: false },
						axisLabel: { show: false },
						detail: {
							valueAnimation: true,
							fontSize: 32,
							fontWeight: 'bold',
							color: '#10b981',
							formatter: '{value}%',
							offsetCenter: [0, '10%']
						},
						title: {
							offsetCenter: [0, '40%'],
							fontSize: 14,
							color: '#64748b'
						},
						data: [{ value: metrics.roiPercent, name: 'ROI' }]
					}
				]
			});
		}

		window.addEventListener('resize', handleResize);
	});

	onDestroy(() => {
		savingsChart?.dispose();
		waterfallChart?.dispose();
		downtimeChart?.dispose();
		roiChart?.dispose();
		if (typeof window !== 'undefined') {
			window.removeEventListener('resize', handleResize);
		}
	});

	function handleResize() {
		savingsChart?.resize();
		waterfallChart?.resize();
		downtimeChart?.resize();
		roiChart?.resize();
	}

	function formatCurrency(value: number) {
		return new Intl.NumberFormat('ru-RU', {
			style: 'currency',
			currency: 'RUB',
			minimumFractionDigits: 0,
			maximumFractionDigits: 0
		}).format(value);
	}
</script>

<div class="mx-auto max-w-7xl space-y-6">
	<!-- Header -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="flex items-center gap-3 text-2xl font-bold text-white">
				<TrendingUp class="h-7 w-7 text-emerald-400" />
				{#if !$isLoading}{$_('analytics.title')}{:else}Business Analytics{/if}
			</h1>
			<p class="mt-1 text-sm text-slate-400">
				{#if !$isLoading}{$_('analytics.subtitle')}{:else}ROI and Economic Impact Analysis{/if}
			</p>
		</div>
		<div class="flex items-center gap-2">
			<Badge variant="success" class="gap-1">
				<ArrowUpRight class="h-3 w-3" />
				+{metrics.oeeImprovement}% OEE
			</Badge>
			<Badge variant="info" class="gap-1">
				<Calendar class="h-3 w-3" />
				2024
			</Badge>
		</div>
	</div>

	<!-- Key Metrics -->
	<div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
		<Card class="relative overflow-hidden">
			<div class="absolute -top-4 -right-4 h-24 w-24 rounded-full bg-emerald-500/10"></div>
			<div class="relative">
				<div class="mb-2 flex items-center gap-2 text-sm text-slate-400">
					<PiggyBank class="h-4 w-4 text-emerald-400" />
					{#if !$isLoading}{$_('analytics.totalSavings')}{:else}Total Savings{/if}
				</div>
				<div class="text-2xl font-bold text-emerald-400">
					{formatCurrency(metrics.totalSavings)}
				</div>
				<div class="mt-1 flex items-center gap-1 text-xs text-emerald-400/70">
					<ArrowUpRight class="h-3 w-3" />
					+23% {#if !$isLoading}{$_('analytics.vsLastYear')}{:else}vs last year{/if}
				</div>
			</div>
		</Card>

		<Card class="relative overflow-hidden">
			<div class="absolute -top-4 -right-4 h-24 w-24 rounded-full bg-cyan-500/10"></div>
			<div class="relative">
				<div class="mb-2 flex items-center gap-2 text-sm text-slate-400">
					<Clock class="h-4 w-4 text-cyan-400" />
					{#if !$isLoading}{$_('analytics.preventedDowntime')}{:else}Prevented Downtime{/if}
				</div>
				<div class="text-2xl font-bold text-cyan-400">
					{metrics.preventedDowntime}
					{$_('units.hours')}
				</div>
				<div class="mt-1 text-xs text-slate-500">
					≈ {formatCurrency(metrics.preventedDowntime * metrics.avgDowntimeCost)}
				</div>
			</div>
		</Card>

		<Card class="relative overflow-hidden">
			<div class="absolute -top-4 -right-4 h-24 w-24 rounded-full bg-amber-500/10"></div>
			<div class="relative">
				<div class="mb-2 flex items-center gap-2 text-sm text-slate-400">
					<AlertTriangle class="h-4 w-4 text-amber-400" />
					{#if !$isLoading}{$_('analytics.preventedFailures')}{:else}Prevented Failures{/if}
				</div>
				<div class="text-2xl font-bold text-amber-400">{metrics.alertsPreventedFailures}</div>
				<div class="mt-1 text-xs text-slate-500">
					{#if !$isLoading}{$_('analytics.criticalFailures')}{:else}Critical Failures{/if}
				</div>
			</div>
		</Card>

		<Card class="relative overflow-hidden">
			<div class="absolute -top-4 -right-4 h-24 w-24 rounded-full bg-purple-500/10"></div>
			<div class="relative">
				<div class="mb-2 flex items-center gap-2 text-sm text-slate-400">
					<Target class="h-4 w-4 text-purple-400" />
					{#if !$isLoading}{$_('analytics.predictedSavings')}{:else}Predicted Next Month{/if}
				</div>
				<div class="text-2xl font-bold text-purple-400">
					{formatCurrency(metrics.predictedSavingsNextMonth)}
				</div>
				<div class="mt-1 text-xs text-slate-500">
					{#if !$isLoading}{$_('analytics.potentialSavings')}{:else}Potential Savings{/if}
				</div>
			</div>
		</Card>
	</div>

	<div class="grid gap-6 lg:grid-cols-3">
		<!-- Waterfall Chart -->
		<Card class="lg:col-span-2">
			<h3 class="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
				<TrendingUp class="h-5 w-5 text-cyan-400" />
				{#if !$isLoading}Анализ прибыли (Waterfall){:else}Profit Waterfall Analysis{/if}
			</h3>
			<div class="h-72 w-full" bind:this={waterfallChartEl}></div>
		</Card>

		<!-- ROI Gauge -->
		<Card>
			<h3 class="mb-2 text-center text-lg font-semibold text-white">
				{#if !$isLoading}{$_('analytics.roiTitle')}{:else}Return on Investment{/if}
			</h3>
			<div class="h-52 w-full" bind:this={roiChartEl}></div>
			<div class="mt-2 text-center">
				<p class="text-sm text-slate-400">
					{#if !$isLoading}{$_('analytics.paybackPeriod')}{:else}Investment paid off in{/if}
					<span class="font-bold text-emerald-400"
						>3.5 {#if !$isLoading}{$_('analytics.months')}{:else}months{/if}</span
					>
				</p>
			</div>
		</Card>
	</div>

	<div class="grid gap-6 lg:grid-cols-2">
		<!-- Downtime Analysis -->
		<Card>
			<h3 class="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
				<Clock class="h-5 w-5 text-cyan-400" />
				{#if !$isLoading}{$_('analytics.downtimeAnalysis')}{:else}Downtime Analysis{/if}
			</h3>
			<div class="grid grid-cols-2 gap-4">
				<div class="h-48" bind:this={downtimeChartEl}></div>
				<div class="space-y-3">
					{#each downtimeAnalysis as item (item.reasonKey)}
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-2">
								<div class="h-3 w-3 rounded" style="background-color: {item.color}"></div>
								<span class="text-sm text-slate-300">
									{#if !$isLoading}{$_(
											`analytics.reasons.${item.reasonKey}`
										)}{:else}{item.reasonKey}{/if}
								</span>
							</div>
							<div class="text-right">
								<div class="text-sm font-medium text-white">{item.hours}{$_('units.hours')}</div>
								{#if item.prevented > 0}
									<div class="text-xs text-emerald-400">
										-{item.prevented}
										{#if !$isLoading}{$_('analytics.prevented')}{:else}prevented{/if}
									</div>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</div>
		</Card>

		<!-- Cost Savings Breakdown -->
		<Card>
			<h3 class="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
				<DollarSign class="h-5 w-5 text-emerald-400" />
				{#if !$isLoading}{$_('analytics.costSavingsBreakdown')}{:else}Cost Savings Breakdown{/if}
			</h3>
			<div class="space-y-4">
				<div>
					<div class="mb-2 flex items-center justify-between text-sm">
						<span class="text-slate-400">
							{#if !$isLoading}{$_('analytics.preventDowntime')}{:else}Prevented Downtime{/if}
						</span>
						<span class="font-medium text-emerald-400">{formatCurrency(1875000)}</span>
					</div>
					<div class="h-3 overflow-hidden rounded-full bg-slate-800">
						<div class="h-full w-[65%] rounded-full bg-emerald-500"></div>
					</div>
				</div>
				<div>
					<div class="mb-2 flex items-center justify-between text-sm">
						<span class="text-slate-400">
							{#if !$isLoading}{$_('analytics.maintenanceOptimization')}{:else}Maintenance
								Optimization{/if}
						</span>
						<span class="font-medium text-cyan-400">{formatCurrency(336000)}</span>
					</div>
					<div class="h-3 overflow-hidden rounded-full bg-slate-800">
						<div class="h-full w-[12%] rounded-full bg-cyan-500"></div>
					</div>
				</div>
				<div>
					<div class="mb-2 flex items-center justify-between text-sm">
						<span class="text-slate-400">
							{#if !$isLoading}{$_('analytics.efficiencyGain')}{:else}Efficiency Gains{/if}
						</span>
						<span class="font-medium text-purple-400">{formatCurrency(276000)}</span>
					</div>
					<div class="h-3 overflow-hidden rounded-full bg-slate-800">
						<div class="h-full w-[10%] rounded-full bg-purple-500"></div>
					</div>
				</div>
				<div>
					<div class="mb-2 flex items-center justify-between text-sm">
						<span class="text-slate-400">
							{#if !$isLoading}{$_('analytics.fuelSavings')}{:else}Fuel Savings{/if}
						</span>
						<span class="font-medium text-amber-400">{formatCurrency(360500)}</span>
					</div>
					<div class="h-3 overflow-hidden rounded-full bg-slate-800">
						<div class="h-full w-[13%] rounded-full bg-amber-500"></div>
					</div>
				</div>
			</div>

			<div class="mt-6 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
				<div class="flex items-center justify-between">
					<span class="font-medium text-white">
						{#if !$isLoading}{$_('analytics.totalForPeriod')}{:else}Total for Period{/if}:
					</span>
					<span class="text-xl font-bold text-emerald-400"
						>{formatCurrency(metrics.totalSavings)}</span
					>
				</div>
			</div>
		</Card>
	</div>

	<!-- Bottom Banner -->
	<Card class="border-cyan-500/20 bg-linear-to-r from-cyan-500/10 to-emerald-500/10">
		<div class="flex flex-col items-center justify-between gap-4 md:flex-row">
			<div class="flex items-center gap-4">
				<div class="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20">
					<CheckCircle class="h-6 w-6 text-emerald-400" />
				</div>
				<div>
					<h3 class="font-semibold text-white">
						{#if !$isLoading}{$_('analytics.systemProfitable')}{:else}System is profitable and
							generating returns{/if}
					</h3>
					<p class="text-sm text-slate-400">
						{#if !$isLoading}{$_('analytics.monthlyProfit', {
								values: { ratio: '4.2' }
							})}{:else}Monthly savings exceed operating costs by 4.2x{/if}
					</p>
				</div>
			</div>
			<Button class="gap-2">
				<Zap class="h-4 w-4" />
				{#if !$isLoading}{$_('analytics.downloadReport')}{:else}Download Report{/if}
			</Button>
		</div>
	</Card>
</div>
