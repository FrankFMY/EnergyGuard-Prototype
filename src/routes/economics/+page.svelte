<script lang="ts">
	import { onMount } from 'svelte';
	import { _, isLoading } from 'svelte-i18n';
	import { Card, Badge } from '$lib/components/ui/index.js';
	import { cn } from '$lib/utils.js';
	import TrendingUp from 'lucide-svelte/icons/trending-up';
	import Fuel from 'lucide-svelte/icons/fuel';
	import Wrench from 'lucide-svelte/icons/wrench';
	import Users from 'lucide-svelte/icons/users';
	import Building from 'lucide-svelte/icons/building-2';
	import Zap from 'lucide-svelte/icons/zap';

	// Cost breakdown data (mock)
	const costBreakdown = {
		gas: 2.85,
		depreciation: 0.95,
		spare_parts: 0.48,
		labor: 0.48,
		other: 0.24,
		total: 5.0,
		cost_per_kwh: 5.0
	};

	const costItems = [
		{ key: 'gas', label: 'Газ', value: costBreakdown.gas, color: 'bg-orange-500', icon: Fuel },
		{
			key: 'depreciation',
			label: 'Амортизация',
			value: costBreakdown.depreciation,
			color: 'bg-blue-500',
			icon: Building
		},
		{
			key: 'spare_parts',
			label: 'ЗИП',
			value: costBreakdown.spare_parts,
			color: 'bg-emerald-500',
			icon: Wrench
		},
		{ key: 'labor', label: 'ФОТ', value: costBreakdown.labor, color: 'bg-purple-500', icon: Users },
		{
			key: 'other',
			label: 'Прочее',
			value: costBreakdown.other,
			color: 'bg-slate-500',
			icon: TrendingUp
		}
	];

	// Monthly trend data (mock)
	const monthlyTrend = [
		{ month: 'Июл', cost: 4.8, production: 2100 },
		{ month: 'Авг', cost: 4.9, production: 2200 },
		{ month: 'Сен', cost: 5.1, production: 2150 },
		{ month: 'Окт', cost: 4.95, production: 2180 },
		{ month: 'Ноя', cost: 5.0, production: 2250 },
		{ month: 'Дек', cost: 5.2, production: 2300 }
	];

	const maxCost = Math.max(...monthlyTrend.map((m) => m.cost));
	const maxProduction = Math.max(...monthlyTrend.map((m) => m.production));

	// Chart constants
	const chartRadius = 35;
	const chartCircumference = 2 * Math.PI * chartRadius;
	const costTotal = costItems.reduce((sum, item) => sum + item.value, 0);

	function getChartOffset(index: number): number {
		return costItems
			.slice(0, index)
			.reduce((sum, prev) => sum + (prev.value / costTotal) * chartCircumference, 0);
	}
</script>

<div class="mx-auto max-w-6xl space-y-6">
	<!-- Header -->
	<div>
		<h1 class="flex items-center gap-3 text-2xl font-bold text-white">
			<TrendingUp class="h-7 w-7 text-cyan-400" />
			{#if !$isLoading}
				{$_('economics.title')}
			{:else}
				Экономика энергии
			{/if}
		</h1>
		<p class="mt-1 text-sm text-slate-400">Структура себестоимости и анализ затрат</p>
	</div>

	<!-- Main KPI -->
	<div class="grid gap-6 md:grid-cols-3">
		<Card class="relative overflow-hidden">
			<div class="absolute -top-4 -right-4 opacity-10">
				<Zap size={100} />
			</div>
			<h3 class="text-sm font-medium text-slate-400">
				{#if !$isLoading}{$_('economics.costPerKwh')}{:else}Себестоимость кВт·ч{/if}
			</h3>
			<div class="mt-2 flex items-baseline gap-2">
				<span class="text-4xl font-bold text-white">{costBreakdown.cost_per_kwh.toFixed(2)}</span>
				<span class="text-lg text-slate-500">₽/кВт·ч</span>
			</div>
			<div class="mt-4 text-xs text-slate-500">Средняя за последний месяц</div>
		</Card>

		<Card>
			<h3 class="text-sm font-medium text-slate-400">Выработка за месяц</h3>
			<div class="mt-2 flex items-baseline gap-2">
				<span class="text-4xl font-bold text-emerald-400">2,300</span>
				<span class="text-lg text-slate-500">МВт·ч</span>
			</div>
			<div class="mt-4 flex items-center gap-2 text-xs text-emerald-400">
				<TrendingUp class="h-4 w-4" />
				+2.2% к прошлому месяцу
			</div>
		</Card>

		<Card>
			<h3 class="text-sm font-medium text-slate-400">Общие затраты</h3>
			<div class="mt-2 flex items-baseline gap-2">
				<span class="text-4xl font-bold text-amber-400">11.5</span>
				<span class="text-lg text-slate-500">млн ₽</span>
			</div>
			<div class="mt-4 flex items-center gap-2 text-xs text-rose-400">
				<TrendingUp class="h-4 w-4 rotate-180" />
				+4.0% к прошлому месяцу
			</div>
		</Card>
	</div>

	<div class="grid gap-6 lg:grid-cols-2">
		<!-- Cost Structure Pie Chart (CSS-based) -->
		<Card>
			<h3 class="mb-6 text-lg font-semibold text-white">
				{#if !$isLoading}{$_('economics.costStructure')}{:else}Структура себестоимости{/if}
			</h3>

			<div class="flex items-center justify-center gap-8">
				<!-- Donut Chart -->
				<div class="relative h-48 w-48">
					<svg viewBox="0 0 100 100" class="h-full w-full -rotate-90">
						{#each costItems as item, i}
							{@const percentage = (item.value / costTotal) * 100}
							<circle
								cx="50"
								cy="50"
								r={chartRadius}
								fill="transparent"
								stroke-width="15"
								class={item.color.replace('bg-', 'stroke-')}
								stroke-dasharray="{(percentage / 100) * chartCircumference} {chartCircumference}"
								stroke-dashoffset={-getChartOffset(i)}
								stroke-linecap="round"
							/>
						{/each}
					</svg>
					<div class="absolute inset-0 flex flex-col items-center justify-center">
						<span class="text-2xl font-bold text-white">{costBreakdown.cost_per_kwh}</span>
						<span class="text-xs text-slate-400">₽/кВт·ч</span>
					</div>
				</div>

				<!-- Legend -->
				<div class="space-y-3">
					{#each costItems as item}
						<div class="flex items-center gap-3">
							<div class={cn('h-3 w-3 rounded-full', item.color)}></div>
							<div class="flex items-center gap-2">
								<item.icon class="h-4 w-4 text-slate-400" />
								<span class="text-sm text-slate-300">{item.label}</span>
							</div>
							<span class="ml-auto font-mono text-sm text-white"
								>{((item.value / costBreakdown.total) * 100).toFixed(0)}%</span
							>
						</div>
					{/each}
				</div>
			</div>
		</Card>

		<!-- Cost Breakdown Details -->
		<Card>
			<h3 class="mb-6 text-lg font-semibold text-white">Детализация затрат</h3>

			<div class="space-y-4">
				{#each costItems as item}
					<div class="rounded-lg bg-slate-800/50 p-4">
						<div class="mb-2 flex items-center justify-between">
							<div class="flex items-center gap-3">
								<div class={cn('rounded-lg p-2', item.color.replace('bg-', 'bg-') + '/20')}>
									<item.icon class={cn('h-5 w-5', item.color.replace('bg-', 'text-'))} />
								</div>
								<div>
									<div class="font-medium text-white">{item.label}</div>
									<div class="text-xs text-slate-400">
										{((item.value / costBreakdown.total) * 100).toFixed(1)}% от общих затрат
									</div>
								</div>
							</div>
							<div class="text-right">
								<div class="font-mono text-lg text-white">{item.value.toFixed(2)}</div>
								<div class="text-xs text-slate-400">₽/кВт·ч</div>
							</div>
						</div>
						<div class="h-1.5 overflow-hidden rounded-full bg-slate-700">
							<div
								class={cn('h-full transition-all duration-1000', item.color)}
								style="width: {(item.value / costBreakdown.total) * 100}%"
							></div>
						</div>
					</div>
				{/each}
			</div>
		</Card>
	</div>

	<!-- Monthly Trend -->
	<Card>
		<h3 class="mb-6 text-lg font-semibold text-white">
			{#if !$isLoading}{$_('economics.monthlyTrend')}{:else}Динамика затрат{/if}
		</h3>

		<div class="flex h-64 items-end gap-4">
			{#each monthlyTrend as month}
				{@const costHeight = (month.cost / maxCost) * 100}
				{@const prodHeight = (month.production / maxProduction) * 100}
				<div class="group relative flex flex-1 flex-col items-center">
					<!-- Bars -->
					<div class="flex h-48 w-full items-end justify-center gap-1">
						<div
							class="w-1/3 rounded-t bg-cyan-500 transition-all duration-500 group-hover:bg-cyan-400"
							style="height: {costHeight}%"
						></div>
						<div
							class="w-1/3 rounded-t bg-emerald-500/50 transition-all duration-500 group-hover:bg-emerald-400/50"
							style="height: {prodHeight}%"
						></div>
					</div>

					<!-- Month Label -->
					<div class="mt-2 text-xs text-slate-400">{month.month}</div>

					<!-- Tooltip -->
					<div
						class="absolute bottom-full mb-2 hidden rounded-lg border border-white/10 bg-slate-900 p-2 text-xs shadow-xl group-hover:block"
					>
						<div class="flex items-center gap-2">
							<div class="h-2 w-2 rounded-full bg-cyan-500"></div>
							<span class="text-slate-400">Себестоимость:</span>
							<span class="text-white">{month.cost} ₽</span>
						</div>
						<div class="mt-1 flex items-center gap-2">
							<div class="h-2 w-2 rounded-full bg-emerald-500"></div>
							<span class="text-slate-400">Выработка:</span>
							<span class="text-white">{month.production} МВт·ч</span>
						</div>
					</div>
				</div>
			{/each}
		</div>

		<!-- Legend -->
		<div class="mt-4 flex justify-center gap-6">
			<div class="flex items-center gap-2">
				<div class="h-3 w-3 rounded-full bg-cyan-500"></div>
				<span class="text-sm text-slate-400">Себестоимость (₽/кВт·ч)</span>
			</div>
			<div class="flex items-center gap-2">
				<div class="h-3 w-3 rounded-full bg-emerald-500/50"></div>
				<span class="text-sm text-slate-400">Выработка (МВт·ч)</span>
			</div>
		</div>
	</Card>
</div>
