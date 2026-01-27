<script lang="ts">
	import { onMount } from 'svelte';
	import { Card, Button, Badge } from '$lib/components/ui/index.js';
	import { cn } from '$lib/utils.js';
	import { _, isLoading } from 'svelte-i18n';
	import LayoutGrid from 'lucide-svelte/icons/layout-grid';
	import Plus from 'lucide-svelte/icons/plus';
	import GripVertical from 'lucide-svelte/icons/grip-vertical';
	import X from 'lucide-svelte/icons/x';
	import Save from 'lucide-svelte/icons/save';
	import Check from 'lucide-svelte/icons/check';
	import RotateCcw from 'lucide-svelte/icons/rotate-ccw';
	import Activity from 'lucide-svelte/icons/activity';
	import Thermometer from 'lucide-svelte/icons/thermometer';
	import Gauge from 'lucide-svelte/icons/gauge';
	import BarChart from 'lucide-svelte/icons/bar-chart-3';
	import Clock from 'lucide-svelte/icons/clock';
	import Bell from 'lucide-svelte/icons/bell';
	import Zap from 'lucide-svelte/icons/zap';

	interface Widget {
		id: string;
		type: 'power' | 'temperature' | 'efficiency' | 'chart' | 'alerts' | 'uptime';
		titleKey: string;
		size: 'small' | 'medium' | 'large';
	}

	const STORAGE_KEY = 'energyguard_dashboard_widgets';

	const availableWidgets: Omit<Widget, 'id'>[] = [
		{ type: 'power', titleKey: 'dashboards.widgets.power', size: 'small' },
		{ type: 'temperature', titleKey: 'dashboards.widgets.temperature', size: 'small' },
		{ type: 'efficiency', titleKey: 'dashboards.widgets.efficiency', size: 'small' },
		{ type: 'chart', titleKey: 'dashboards.widgets.chart', size: 'large' },
		{ type: 'alerts', titleKey: 'dashboards.widgets.alerts', size: 'medium' },
		{ type: 'uptime', titleKey: 'dashboards.widgets.uptime', size: 'small' }
	];

	const defaultWidgets: Widget[] = [
		{ id: '1', type: 'power', titleKey: 'dashboards.widgets.power', size: 'small' },
		{ id: '2', type: 'temperature', titleKey: 'dashboards.widgets.temperature', size: 'small' },
		{ id: '3', type: 'efficiency', titleKey: 'dashboards.widgets.efficiency', size: 'small' },
		{ id: '4', type: 'chart', titleKey: 'dashboards.widgets.chart', size: 'large' }
	];

	let dashboardWidgets: Widget[] = $state([...defaultWidgets]);
	let editMode = $state(false);
	let draggedWidget: string | null = $state(null);
	let saved = $state(false);

	onMount(() => {
		// Load saved layout from localStorage
		const savedLayout = localStorage.getItem(STORAGE_KEY);
		if (savedLayout) {
			try {
				dashboardWidgets = JSON.parse(savedLayout);
			} catch {
				dashboardWidgets = [...defaultWidgets];
			}
		}
	});

	function addWidget(widgetType: Omit<Widget, 'id'>) {
		const newWidget: Widget = {
			...widgetType,
			id: crypto.randomUUID()
		};
		dashboardWidgets = [...dashboardWidgets, newWidget];
	}

	function removeWidget(widgetId: string) {
		dashboardWidgets = dashboardWidgets.filter((w) => w.id !== widgetId);
	}

	function saveLayout() {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(dashboardWidgets));
		saved = true;
		setTimeout(() => (saved = false), 2000);
	}

	function resetLayout() {
		dashboardWidgets = [...defaultWidgets];
		localStorage.removeItem(STORAGE_KEY);
	}

	function handleDragStart(widgetId: string) {
		draggedWidget = widgetId;
	}

	function handleDragOver(e: DragEvent, targetId: string) {
		e.preventDefault();
		if (!draggedWidget || draggedWidget === targetId) return;

		const draggedIdx = dashboardWidgets.findIndex((w) => w.id === draggedWidget);
		const targetIdx = dashboardWidgets.findIndex((w) => w.id === targetId);

		if (draggedIdx !== -1 && targetIdx !== -1) {
			const items = [...dashboardWidgets];
			const [removed] = items.splice(draggedIdx, 1);
			items.splice(targetIdx, 0, removed);
			dashboardWidgets = items;
		}
	}

	function handleDragEnd() {
		draggedWidget = null;
	}

	function getWidgetIcon(type: Widget['type']) {
		switch (type) {
			case 'power':
				return Activity;
			case 'temperature':
				return Thermometer;
			case 'efficiency':
				return Gauge;
			case 'chart':
				return BarChart;
			case 'alerts':
				return Bell;
			case 'uptime':
				return Clock;
		}
	}

	function getWidgetColSpan(size: Widget['size']) {
		switch (size) {
			case 'small':
				return 'md:col-span-1';
			case 'medium':
				return 'md:col-span-2';
			case 'large':
				return 'md:col-span-3';
		}
	}

	function getWidgetContent(type: Widget['type']) {
		switch (type) {
			case 'power':
				return { value: '1,245', unitKey: 'units.kw', trend: '+2.3%' };
			case 'temperature':
				return { value: '487', unit: '°C', trend: '-1.2%' };
			case 'efficiency':
				return { value: '42.5', unit: '%', trend: '+0.5%' };
			case 'uptime':
				return { value: '99.2', unit: '%', trend: '+0.1%' };
			default:
				return null;
		}
	}
</script>

<svelte:head>
	<title>{$isLoading ? 'Дашборды' : $_('dashboards.pageTitle')} - EnergyGuard</title>
</svelte:head>

<div class="mx-auto max-w-7xl space-y-6">
	<!-- Header -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="flex items-center gap-3 text-2xl font-bold text-white">
				<LayoutGrid class="h-7 w-7 text-cyan-400" />
				{#if !$isLoading}{$_('dashboards.title')}{:else}Конструктор дашбордов{/if}
			</h1>
			<p class="mt-1 text-sm text-slate-400">
				{#if !$isLoading}{$_('dashboards.subtitle')}{:else}Создайте свою панель мониторинга{/if}
			</p>
		</div>
		<div class="flex flex-wrap items-center gap-2">
			<Button
				variant={editMode ? 'primary' : 'outline'}
				onclick={() => (editMode = !editMode)}
				class="gap-2"
			>
				{#if editMode}
					<Check class="h-4 w-4" />
					{#if !$isLoading}{$_('dashboards.exitEditMode')}{:else}Готово{/if}
				{:else}
					<LayoutGrid class="h-4 w-4" />
					{#if !$isLoading}{$_('dashboards.editMode')}{:else}Редактировать{/if}
				{/if}
			</Button>
			{#if editMode}
				<Button variant="outline" class="gap-2" onclick={resetLayout}>
					<RotateCcw class="h-4 w-4" />
					<span class="hidden sm:inline">
						{#if !$isLoading}{$_('dashboards.reset')}{:else}Сбросить{/if}
					</span>
				</Button>
			{/if}
			<Button variant="outline" class="gap-2" onclick={saveLayout} disabled={saved}>
				{#if saved}
					<Check class="h-4 w-4 text-emerald-400" />
					<span class="text-emerald-400">
						{#if !$isLoading}{$_('common.saved')}{:else}Сохранено{/if}
					</span>
				{:else}
					<Save class="h-4 w-4" />
					<span class="hidden sm:inline">
						{#if !$isLoading}{$_('dashboards.saveLayout')}{:else}Сохранить{/if}
					</span>
				{/if}
			</Button>
		</div>
	</div>

	{#if editMode}
		<!-- Widget Palette -->
		<Card>
			<h3 class="mb-4 text-sm font-semibold text-white">
				{#if !$isLoading}{$_('dashboards.addWidgets')}{:else}Добавить виджеты{/if}
			</h3>
			<div class="flex flex-wrap gap-2">
				{#each availableWidgets as widget (widget.type)}
					{@const Icon = getWidgetIcon(widget.type)}
					<button
						type="button"
						class="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-300 transition hover:border-cyan-500/50 hover:bg-slate-700"
						onclick={() => addWidget(widget)}
					>
						<Icon class="h-4 w-4 text-cyan-400" />
						<span class="hidden xs:inline">
							{#if !$isLoading}{$_(widget.titleKey)}{:else}Виджет{/if}
						</span>
						<Plus class="h-3 w-3 text-slate-500" />
					</button>
				{/each}
			</div>
		</Card>
	{/if}

	<!-- Dashboard Grid -->
	<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
		{#each dashboardWidgets as widget (widget.id)}
			{@const Icon = getWidgetIcon(widget.type)}
			{@const content = getWidgetContent(widget.type)}
			<div
				class={cn('group col-span-1', getWidgetColSpan(widget.size))}
				role={editMode ? 'listitem' : undefined}
				draggable={editMode}
				ondragstart={() => handleDragStart(widget.id)}
				ondragover={(e) => handleDragOver(e, widget.id)}
				ondragend={handleDragEnd}
			>
				<Card
					class={cn(
						'relative h-full transition',
						editMode && 'cursor-move border-dashed hover:border-cyan-500/50',
						draggedWidget === widget.id && 'opacity-50'
					)}
				>
					{#if editMode}
						<div
							class="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-100 transition md:opacity-0 md:group-hover:opacity-100"
						>
							<button
								type="button"
								class="rounded bg-slate-800/80 p-1.5 text-slate-400 backdrop-blur-sm hover:bg-rose-500/20 hover:text-rose-400"
								onclick={() => removeWidget(widget.id)}
								aria-label="Remove widget"
							>
								<X class="h-4 w-4" />
							</button>
							<div
								class="hidden cursor-grab rounded bg-slate-800/80 p-1.5 text-slate-400 backdrop-blur-sm md:block"
							>
								<GripVertical class="h-4 w-4" />
							</div>
						</div>
					{/if}

					<div class="mb-3 flex items-center gap-2">
						<Icon class="h-5 w-5 text-cyan-400" />
						<h3 class="text-sm font-medium text-slate-300">
							{#if !$isLoading}{$_(widget.titleKey)}{:else}—{/if}
						</h3>
					</div>

					{#if widget.type === 'chart'}
						<div
							class="flex h-32 items-center justify-center rounded-lg bg-slate-800/50 text-slate-500 sm:h-48"
						>
							<div class="text-center">
								<BarChart class="mx-auto mb-2 h-8 w-8 opacity-50" />
								<p class="text-xs">
									{#if !$isLoading}{$_('dashboards.chartPlaceholder')}{:else}Визуализация{/if}
								</p>
							</div>
						</div>
					{:else if widget.type === 'alerts'}
						<div class="space-y-2">
							<div class="flex items-center justify-between rounded bg-rose-500/10 px-3 py-2">
								<span class="text-xs text-rose-400 sm:text-sm"
									>GPU-2 {#if !$isLoading}{$_('dashboards.highTemp')}{:else}Высокая темп.{/if}</span
								>
								<Badge variant="danger">
									{#if !$isLoading}{$_('alerts.severity.critical')}{:else}Критический{/if}
								</Badge>
							</div>
							<div class="flex items-center justify-between rounded bg-amber-500/10 px-3 py-2">
								<span class="text-xs text-amber-400 sm:text-sm"
									>GPU-4 {#if !$isLoading}{$_('engine.vibration')}{:else}Вибрация{/if}</span
								>
								<Badge variant="warning">
									{#if !$isLoading}{$_('alerts.severity.warning')}{:else}Предупреждение{/if}
								</Badge>
							</div>
						</div>
					{:else if content}
						<div class="flex items-baseline gap-2">
							<span class="text-3xl font-bold text-white sm:text-4xl">{content.value}</span>
							<span class="text-base text-slate-500 sm:text-lg">
								{#if content.unitKey}
									{#if !$isLoading}{$_(content.unitKey)}{:else}{content.unitKey}{/if}
								{:else}
									{content.unit}
								{/if}
							</span>
						</div>
						<div
							class="mt-2 text-xs sm:text-sm {content.trend.startsWith('+')
								? 'text-emerald-400'
								: 'text-rose-400'}"
						>
							{content.trend}
							{#if !$isLoading}{$_('dashboards.vsLastHour')}{:else}за час{/if}
						</div>
					{/if}
				</Card>
			</div>
		{/each}

		{#if editMode && dashboardWidgets.length === 0}
			<div
				class="col-span-1 rounded-xl border-2 border-dashed border-slate-700 p-8 text-center sm:p-12 md:col-span-3"
			>
				<LayoutGrid class="mx-auto mb-4 h-10 w-10 text-slate-600 sm:h-12 sm:w-12" />
				<p class="text-sm text-slate-400 sm:text-base">
					{#if !$isLoading}{$_('dashboards.emptyHint')}{:else}Нажмите на виджеты выше, чтобы
						добавить их{/if}
				</p>
			</div>
		{/if}
	</div>

	<!-- Info Card -->
	<Card class="border-cyan-500/20 bg-cyan-500/5">
		<div class="flex gap-4">
			<Zap class="h-5 w-5 shrink-0 text-cyan-400" />
			<div class="text-sm text-slate-300">
				<p class="mb-2 font-medium">
					{#if !$isLoading}{$_('dashboards.tipTitle')}{:else}Подсказка{/if}
				</p>
				<p class="text-slate-400">
					{#if !$isLoading}{$_('dashboards.tipText')}{:else}Перетаскивайте виджеты для изменения
						порядка. Ваш макет сохраняется автоматически в браузере.{/if}
				</p>
			</div>
		</div>
	</Card>
</div>
