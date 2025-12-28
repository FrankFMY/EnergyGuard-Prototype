<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
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
		totalSavings: 2847500, // ₽ saved this year
		preventedDowntime: 127, // hours
		avgDowntimeCost: 45000, // ₽ per hour
		predictedSavingsNextMonth: 380000,
		oeeImprovement: 8.5, // percentage points
		maintenanceCostReduction: 23, // percent
		alertsPreventedFailures: 14,
		roiPercent: 340
	};

	// Monthly savings data
	const monthlySavings = [
		{ month: 'Июль', prevented: 180000, maintenance: 45000, efficiency: 32000 },
		{ month: 'Авг', prevented: 225000, maintenance: 52000, efficiency: 41000 },
		{ month: 'Сен', prevented: 270000, maintenance: 48000, efficiency: 38000 },
		{ month: 'Окт', prevented: 315000, maintenance: 61000, efficiency: 45000 },
		{ month: 'Ноя', prevented: 405000, maintenance: 58000, efficiency: 52000 },
		{ month: 'Дек', prevented: 480000, maintenance: 72000, efficiency: 68000 }
	];

	// Downtime analysis
	const downtimeAnalysis = [
		{ reason: 'Перегрев', hours: 12, cost: 540000, prevented: 8, color: '#f43f5e' },
		{ reason: 'Вибрация', hours: 8, cost: 360000, prevented: 5, color: '#f59e0b' },
		{ reason: 'Давление газа', hours: 5, cost: 225000, prevented: 3, color: '#06b6d4' },
		{ reason: 'Плановое ТО', hours: 24, cost: 1080000, prevented: 0, color: '#10b981' }
	];

	type EChartsInstance = {
		dispose: () => void;
		resize: () => void;
		setOption: (option: unknown) => void;
	};

	let savingsChartEl = $state<HTMLDivElement>();
	let downtimeChartEl = $state<HTMLDivElement>();
	let roiChartEl = $state<HTMLDivElement>();
	let savingsChart: EChartsInstance | null = null;
	let downtimeChart: EChartsInstance | null = null;
	let roiChart: EChartsInstance | null = null;

	onMount(async () => {
		const echarts = await import('echarts');

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
					data: ['Предотвращенные простои', 'Экономия на ТО', 'Эффективность'],
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
						name: 'Предотвращенные простои',
						type: 'bar',
						stack: 'total',
						data: monthlySavings.map((m) => m.prevented),
						itemStyle: { color: '#10b981' }
					},
					{
						name: 'Экономия на ТО',
						type: 'bar',
						stack: 'total',
						data: monthlySavings.map((m) => m.maintenance),
						itemStyle: { color: '#06b6d4' }
					},
					{
						name: 'Эффективность',
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
					formatter: '{b}: {c} ч ({d}%)'
				},
				series: [
					{
						type: 'pie',
						radius: ['50%', '75%'],
						avoidLabelOverlap: false,
						itemStyle: { borderRadius: 4, borderColor: '#0f172a', borderWidth: 2 },
						label: { show: false },
						data: downtimeAnalysis.map((d) => ({
							name: d.reason,
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
		downtimeChart?.dispose();
		roiChart?.dispose();
		if (typeof window !== 'undefined') {
			window.removeEventListener('resize', handleResize);
		}
	});

	function handleResize() {
		savingsChart?.resize();
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
				Бизнес-аналитика
			</h1>
			<p class="mt-1 text-sm text-slate-400">ROI и экономический эффект от внедрения системы</p>
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
					Общая экономия
				</div>
				<div class="text-2xl font-bold text-emerald-400">
					{formatCurrency(metrics.totalSavings)}
				</div>
				<div class="mt-1 flex items-center gap-1 text-xs text-emerald-400/70">
					<ArrowUpRight class="h-3 w-3" />
					+23% vs прошлый год
				</div>
			</div>
		</Card>

		<Card class="relative overflow-hidden">
			<div class="absolute -top-4 -right-4 h-24 w-24 rounded-full bg-cyan-500/10"></div>
			<div class="relative">
				<div class="mb-2 flex items-center gap-2 text-sm text-slate-400">
					<Clock class="h-4 w-4 text-cyan-400" />
					Предотвращено простоев
				</div>
				<div class="text-2xl font-bold text-cyan-400">{metrics.preventedDowntime} ч</div>
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
					Предотвращено аварий
				</div>
				<div class="text-2xl font-bold text-amber-400">{metrics.alertsPreventedFailures}</div>
				<div class="mt-1 text-xs text-slate-500">Критических отказов</div>
			</div>
		</Card>

		<Card class="relative overflow-hidden">
			<div class="absolute -top-4 -right-4 h-24 w-24 rounded-full bg-purple-500/10"></div>
			<div class="relative">
				<div class="mb-2 flex items-center gap-2 text-sm text-slate-400">
					<Target class="h-4 w-4 text-purple-400" />
					Прогноз на месяц
				</div>
				<div class="text-2xl font-bold text-purple-400">
					{formatCurrency(metrics.predictedSavingsNextMonth)}
				</div>
				<div class="mt-1 text-xs text-slate-500">Потенциальная экономия</div>
			</div>
		</Card>
	</div>

	<div class="grid gap-6 lg:grid-cols-3">
		<!-- Savings Trend Chart -->
		<Card class="lg:col-span-2">
			<h3 class="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
				<TrendingUp class="h-5 w-5 text-emerald-400" />
				Динамика экономии по месяцам
			</h3>
			<div class="h-72 w-full" bind:this={savingsChartEl}></div>
		</Card>

		<!-- ROI Gauge -->
		<Card>
			<h3 class="mb-2 text-center text-lg font-semibold text-white">Return on Investment</h3>
			<div class="h-52 w-full" bind:this={roiChartEl}></div>
			<div class="mt-2 text-center">
				<p class="text-sm text-slate-400">
					Инвестиции окупились за <span class="font-bold text-emerald-400">3.5 месяца</span>
				</p>
			</div>
		</Card>
	</div>

	<div class="grid gap-6 lg:grid-cols-2">
		<!-- Downtime Analysis -->
		<Card>
			<h3 class="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
				<Clock class="h-5 w-5 text-cyan-400" />
				Анализ простоев
			</h3>
			<div class="grid grid-cols-2 gap-4">
				<div class="h-48" bind:this={downtimeChartEl}></div>
				<div class="space-y-3">
					{#each downtimeAnalysis as item (item.reason)}
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-2">
								<div class="h-3 w-3 rounded" style="background-color: {item.color}"></div>
								<span class="text-sm text-slate-300">{item.reason}</span>
							</div>
							<div class="text-right">
								<div class="text-sm font-medium text-white">{item.hours}ч</div>
								{#if item.prevented > 0}
									<div class="text-xs text-emerald-400">-{item.prevented} предотвр.</div>
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
				Структура экономии
			</h3>
			<div class="space-y-4">
				<div>
					<div class="mb-2 flex items-center justify-between text-sm">
						<span class="text-slate-400">Предотвращение простоев</span>
						<span class="font-medium text-emerald-400">{formatCurrency(1875000)}</span>
					</div>
					<div class="h-3 overflow-hidden rounded-full bg-slate-800">
						<div class="h-full w-[65%] rounded-full bg-emerald-500"></div>
					</div>
				</div>
				<div>
					<div class="mb-2 flex items-center justify-between text-sm">
						<span class="text-slate-400">Оптимизация ТО</span>
						<span class="font-medium text-cyan-400">{formatCurrency(336000)}</span>
					</div>
					<div class="h-3 overflow-hidden rounded-full bg-slate-800">
						<div class="h-full w-[12%] rounded-full bg-cyan-500"></div>
					</div>
				</div>
				<div>
					<div class="mb-2 flex items-center justify-between text-sm">
						<span class="text-slate-400">Повышение эффективности</span>
						<span class="font-medium text-purple-400">{formatCurrency(276000)}</span>
					</div>
					<div class="h-3 overflow-hidden rounded-full bg-slate-800">
						<div class="h-full w-[10%] rounded-full bg-purple-500"></div>
					</div>
				</div>
				<div>
					<div class="mb-2 flex items-center justify-between text-sm">
						<span class="text-slate-400">Снижение расхода топлива</span>
						<span class="font-medium text-amber-400">{formatCurrency(360500)}</span>
					</div>
					<div class="h-3 overflow-hidden rounded-full bg-slate-800">
						<div class="h-full w-[13%] rounded-full bg-amber-500"></div>
					</div>
				</div>
			</div>

			<div class="mt-6 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
				<div class="flex items-center justify-between">
					<span class="font-medium text-white">Итого за период:</span>
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
					<h3 class="font-semibold text-white">Система окупилась и приносит прибыль</h3>
					<p class="text-sm text-slate-400">
						Ежемесячная экономия превышает стоимость эксплуатации в 4.2 раза
					</p>
				</div>
			</div>
			<Button class="gap-2">
				<Zap class="h-4 w-4" />
				Скачать отчет
			</Button>
		</div>
	</Card>
</div>
