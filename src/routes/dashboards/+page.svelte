<script lang="ts">
	import { Card, Button, Badge } from '$lib/components/ui/index.js';
	import { cn } from '$lib/utils.js';
	import LayoutGrid from 'lucide-svelte/icons/layout-grid';
	import Plus from 'lucide-svelte/icons/plus';
	import GripVertical from 'lucide-svelte/icons/grip-vertical';
	import X from 'lucide-svelte/icons/x';
	import Save from 'lucide-svelte/icons/save';
	import Activity from 'lucide-svelte/icons/activity';
	import Thermometer from 'lucide-svelte/icons/thermometer';
	import Gauge from 'lucide-svelte/icons/gauge';
	import BarChart from 'lucide-svelte/icons/bar-chart-3';
	import Clock from 'lucide-svelte/icons/clock';
	import Bell from 'lucide-svelte/icons/bell';

	interface Widget {
		id: string;
		type: 'power' | 'temperature' | 'efficiency' | 'chart' | 'alerts' | 'uptime';
		title: string;
		size: 'small' | 'medium' | 'large';
	}

	const availableWidgets: Omit<Widget, 'id'>[] = [
		{ type: 'power', title: 'Power Output', size: 'small' },
		{ type: 'temperature', title: 'Temperature', size: 'small' },
		{ type: 'efficiency', title: 'Efficiency', size: 'small' },
		{ type: 'chart', title: 'Performance Chart', size: 'large' },
		{ type: 'alerts', title: 'Active Alerts', size: 'medium' },
		{ type: 'uptime', title: 'Uptime', size: 'small' }
	];

	let dashboardWidgets: Widget[] = $state([
		{ id: '1', type: 'power', title: 'Power Output', size: 'small' },
		{ id: '2', type: 'temperature', title: 'Temperature', size: 'small' },
		{ id: '3', type: 'efficiency', title: 'Efficiency', size: 'small' },
		{ id: '4', type: 'chart', title: 'Performance Chart', size: 'large' }
	]);

	let editMode = $state(true);
	let draggedWidget: string | null = $state(null);

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
				return 'col-span-1';
			case 'medium':
				return 'col-span-2';
			case 'large':
				return 'col-span-3';
		}
	}

	function getWidgetContent(widget: Widget) {
		switch (widget.type) {
			case 'power':
				return { value: '1,245', unit: 'kW', trend: '+2.3%' };
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

<div class="mx-auto max-w-7xl space-y-6">
	<!-- Header -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="flex items-center gap-3 text-2xl font-bold text-white">
				<LayoutGrid class="h-7 w-7 text-cyan-400" />
				Custom Dashboards
			</h1>
			<p class="mt-1 text-sm text-slate-400">Build your personalized dashboard layout</p>
		</div>
		<div class="flex items-center gap-2">
			<Button
				variant={editMode ? 'primary' : 'outline'}
				onclick={() => (editMode = !editMode)}
				class="gap-2"
			>
				{editMode ? 'Exit Edit Mode' : 'Edit Dashboard'}
			</Button>
			<Button variant="outline" class="gap-2">
				<Save class="h-4 w-4" />
				Save Layout
			</Button>
		</div>
	</div>

	{#if editMode}
		<!-- Widget Palette -->
		<Card>
			<h3 class="mb-4 text-sm font-semibold text-white">Add Widgets</h3>
			<div class="flex flex-wrap gap-2">
				{#each availableWidgets as widget}
					{@const Icon = getWidgetIcon(widget.type)}
					<button
						type="button"
						class="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-300 transition hover:border-cyan-500/50 hover:bg-slate-700"
						onclick={() => addWidget(widget)}
					>
						<Icon class="h-4 w-4 text-cyan-400" />
						{widget.title}
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
			{@const content = getWidgetContent(widget)}
			<div
				class={cn('group', getWidgetColSpan(widget.size))}
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
							class="absolute top-2 right-2 flex items-center gap-1 opacity-0 transition group-hover:opacity-100"
						>
							<button
								type="button"
								class="rounded p-1 text-slate-500 hover:bg-slate-800 hover:text-white"
								onclick={() => removeWidget(widget.id)}
								aria-label="Remove widget"
							>
								<X class="h-4 w-4" />
							</button>
							<div class="cursor-grab text-slate-500">
								<GripVertical class="h-4 w-4" />
							</div>
						</div>
					{/if}

					<div class="mb-3 flex items-center gap-2">
						<Icon class="h-5 w-5 text-cyan-400" />
						<h3 class="text-sm font-medium text-slate-300">{widget.title}</h3>
					</div>

					{#if widget.type === 'chart'}
						<div
							class="flex h-48 items-center justify-center rounded-lg bg-slate-800/50 text-slate-500"
						>
							<div class="text-center">
								<BarChart class="mx-auto mb-2 h-8 w-8 opacity-50" />
								<p class="text-xs">Chart visualization</p>
							</div>
						</div>
					{:else if widget.type === 'alerts'}
						<div class="space-y-2">
							<div class="flex items-center justify-between rounded bg-rose-500/10 px-3 py-2">
								<span class="text-sm text-rose-400">GPU-2 High Temp</span>
								<Badge variant="danger">Critical</Badge>
							</div>
							<div class="flex items-center justify-between rounded bg-amber-500/10 px-3 py-2">
								<span class="text-sm text-amber-400">GPU-4 Vibration</span>
								<Badge variant="warning">Warning</Badge>
							</div>
						</div>
					{:else if content}
						<div class="flex items-baseline gap-2">
							<span class="text-4xl font-bold text-white">{content.value}</span>
							<span class="text-lg text-slate-500">{content.unit}</span>
						</div>
						<div
							class="mt-2 text-sm {content.trend.startsWith('+')
								? 'text-emerald-400'
								: 'text-rose-400'}"
						>
							{content.trend} vs last hour
						</div>
					{/if}
				</Card>
			</div>
		{/each}

		{#if editMode && dashboardWidgets.length === 0}
			<div class="col-span-3 rounded-xl border-2 border-dashed border-slate-700 p-12 text-center">
				<LayoutGrid class="mx-auto mb-4 h-12 w-12 text-slate-600" />
				<p class="text-slate-400">Click on widgets above to add them to your dashboard</p>
			</div>
		{/if}
	</div>
</div>
