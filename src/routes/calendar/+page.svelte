<script lang="ts">
	import { Card, Badge } from '$lib/components/ui/index.js';
	import { cn } from '$lib/utils.js';
	import CalendarIcon from 'lucide-svelte/icons/calendar';
	import ChevronLeft from 'lucide-svelte/icons/chevron-left';
	import ChevronRight from 'lucide-svelte/icons/chevron-right';
	import Wrench from 'lucide-svelte/icons/wrench';
	import AlertTriangle from 'lucide-svelte/icons/alert-triangle';
	import Clock from 'lucide-svelte/icons/clock';

	// Mock scheduled events
	const events = [
		{
			id: '1',
			title: 'GPU-1 Oil Change',
			date: new Date(2025, 0, 15),
			type: 'maintenance',
			engine_id: 'gpu-1'
		},
		{
			id: '2',
			title: 'GPU-2 Spark Plugs',
			date: new Date(2025, 0, 18),
			type: 'maintenance',
			engine_id: 'gpu-2'
		},
		{
			id: '3',
			title: 'GPU-4 Inspection',
			date: new Date(2025, 0, 22),
			type: 'inspection',
			engine_id: 'gpu-4'
		},
		{
			id: '4',
			title: 'GPU-3 Overhaul',
			date: new Date(2025, 1, 5),
			type: 'overhaul',
			engine_id: 'gpu-3'
		},
		{
			id: '5',
			title: 'GPU-2 Downtime',
			date: new Date(2025, 0, 10),
			type: 'downtime',
			engine_id: 'gpu-2'
		}
	];

	let currentDate = $state(new Date());

	const currentMonth = $derived(currentDate.getMonth());
	const currentYear = $derived(currentDate.getFullYear());

	const monthNames = [
		'January',
		'February',
		'March',
		'April',
		'May',
		'June',
		'July',
		'August',
		'September',
		'October',
		'November',
		'December'
	];

	const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

	function getDaysInMonth(month: number, year: number) {
		return new Date(year, month + 1, 0).getDate();
	}

	function getFirstDayOfMonth(month: number, year: number) {
		return new Date(year, month, 1).getDay();
	}

	const calendarDays = $derived.by(() => {
		const daysInMonth = getDaysInMonth(currentMonth, currentYear);
		const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
		const days: (number | null)[] = [];

		// Add empty cells for days before the first day of the month
		for (let i = 0; i < firstDay; i++) {
			days.push(null);
		}

		// Add days of the month
		for (let i = 1; i <= daysInMonth; i++) {
			days.push(i);
		}

		return days;
	});

	function getEventsForDay(day: number | null) {
		if (!day) return [];
		return events.filter((e) => {
			return (
				e.date.getDate() === day &&
				e.date.getMonth() === currentMonth &&
				e.date.getFullYear() === currentYear
			);
		});
	}

	function previousMonth() {
		currentDate = new Date(currentYear, currentMonth - 1, 1);
	}

	function nextMonth() {
		currentDate = new Date(currentYear, currentMonth + 1, 1);
	}

	function isToday(day: number | null) {
		if (!day) return false;
		const today = new Date();
		return (
			day === today.getDate() &&
			currentMonth === today.getMonth() &&
			currentYear === today.getFullYear()
		);
	}

	function getEventColor(type: string) {
		switch (type) {
			case 'maintenance':
				return 'bg-cyan-500';
			case 'inspection':
				return 'bg-emerald-500';
			case 'overhaul':
				return 'bg-amber-500';
			case 'downtime':
				return 'bg-rose-500';
			default:
				return 'bg-slate-500';
		}
	}
</script>

<div class="mx-auto max-w-6xl space-y-6">
	<!-- Header -->
	<div>
		<h1 class="flex items-center gap-3 text-2xl font-bold text-white">
			<CalendarIcon class="h-7 w-7 text-cyan-400" />
			Maintenance Calendar
		</h1>
		<p class="mt-1 text-sm text-slate-400">View scheduled maintenance and events</p>
	</div>

	<div class="grid gap-6 lg:grid-cols-4">
		<!-- Calendar -->
		<Card class="overflow-hidden p-0 lg:col-span-3">
			<!-- Month Navigation -->
			<div class="flex items-center justify-between border-b border-white/5 bg-slate-900/50 p-4">
				<button
					type="button"
					onclick={previousMonth}
					class="rounded-lg p-2 text-slate-400 transition hover:bg-white/5 hover:text-white"
					aria-label="Previous month"
				>
					<ChevronLeft class="h-5 w-5" />
				</button>
				<h2 class="text-lg font-semibold text-white">
					{monthNames[currentMonth]}
					{currentYear}
				</h2>
				<button
					type="button"
					onclick={nextMonth}
					class="rounded-lg p-2 text-slate-400 transition hover:bg-white/5 hover:text-white"
					aria-label="Next month"
				>
					<ChevronRight class="h-5 w-5" />
				</button>
			</div>

			<!-- Day Headers -->
			<div class="grid grid-cols-7 border-b border-white/5 bg-slate-900/30">
				{#each dayNames as day}
					<div class="p-3 text-center text-xs font-medium text-slate-500">
						{day}
					</div>
				{/each}
			</div>

			<!-- Calendar Grid -->
			<div class="grid grid-cols-7">
				{#each calendarDays as day, i}
					{@const dayEvents = getEventsForDay(day)}
					<div
						class={cn(
							'min-h-24 border-r border-b border-white/5 p-2 transition',
							day && 'hover:bg-white/5',
							isToday(day) && 'bg-cyan-500/10'
						)}
					>
						{#if day}
							<div
								class={cn(
									'mb-1 text-sm font-medium',
									isToday(day) ? 'text-cyan-400' : 'text-slate-400'
								)}
							>
								{day}
							</div>
							<div class="space-y-1">
								{#each dayEvents.slice(0, 2) as event}
									<div
										class="truncate rounded px-1.5 py-0.5 text-xs text-white {getEventColor(
											event.type
										)}"
									>
										{event.title}
									</div>
								{/each}
								{#if dayEvents.length > 2}
									<div class="text-xs text-slate-500">+{dayEvents.length - 2} more</div>
								{/if}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</Card>

		<!-- Legend & Upcoming -->
		<div class="space-y-6">
			<!-- Legend -->
			<Card>
				<h3 class="mb-4 text-sm font-semibold text-white">Legend</h3>
				<div class="space-y-2">
					<div class="flex items-center gap-2 text-xs">
						<div class="h-3 w-3 rounded bg-cyan-500"></div>
						<span class="text-slate-300">Maintenance</span>
					</div>
					<div class="flex items-center gap-2 text-xs">
						<div class="h-3 w-3 rounded bg-emerald-500"></div>
						<span class="text-slate-300">Inspection</span>
					</div>
					<div class="flex items-center gap-2 text-xs">
						<div class="h-3 w-3 rounded bg-amber-500"></div>
						<span class="text-slate-300">Overhaul</span>
					</div>
					<div class="flex items-center gap-2 text-xs">
						<div class="h-3 w-3 rounded bg-rose-500"></div>
						<span class="text-slate-300">Downtime</span>
					</div>
				</div>
			</Card>

			<!-- Upcoming Events -->
			<Card>
				<h3 class="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
					<Clock class="h-4 w-4 text-cyan-400" />
					Upcoming
				</h3>
				<div class="space-y-3">
					{#each events.filter((e) => e.date >= new Date()).slice(0, 4) as event}
						<div class="rounded-lg bg-slate-800/50 p-3">
							<div class="mb-1 flex items-center gap-2">
								<div class="h-2 w-2 rounded-full {getEventColor(event.type)}"></div>
								<span class="text-sm font-medium text-white">{event.title}</span>
							</div>
							<div class="text-xs text-slate-500">
								{event.date.toLocaleDateString()}
							</div>
						</div>
					{/each}
				</div>
			</Card>
		</div>
	</div>
</div>
