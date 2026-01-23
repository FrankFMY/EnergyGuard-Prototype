<script lang="ts">
	import { _, isLoading } from 'svelte-i18n';
	import { Card, Modal, Button, Badge } from '$lib/components/ui/index.js';
	import { toastStore } from '$lib/state/toast.svelte.js';
	import { cn } from '$lib/utils.js';
	import CalendarIcon from 'lucide-svelte/icons/calendar';
	import ChevronLeft from 'lucide-svelte/icons/chevron-left';
	import ChevronRight from 'lucide-svelte/icons/chevron-right';
	import Clock from 'lucide-svelte/icons/clock';
	import Plus from 'lucide-svelte/icons/plus';
	import Wrench from 'lucide-svelte/icons/wrench';
	import Search from 'lucide-svelte/icons/search';
	import AlertTriangle from 'lucide-svelte/icons/alert-triangle';
	import Settings from 'lucide-svelte/icons/settings';
	import User from 'lucide-svelte/icons/user';
	import MapPin from 'lucide-svelte/icons/map-pin';
	import FileText from 'lucide-svelte/icons/file-text';
	import CheckCircle from 'lucide-svelte/icons/check-circle';

	interface CalendarEvent {
		id: string;
		title: string;
		titleEn: string;
		date: Date;
		type: 'maintenance' | 'inspection' | 'overhaul' | 'downtime';
		engine_id: string;
		description?: string;
		descriptionEn?: string;
		assignee?: string;
		priority?: 'low' | 'medium' | 'high';
		estimatedDuration?: string;
	}

	// Mock scheduled events - use current year
	const currentYear = new Date().getFullYear();
	const currentMonthNum = new Date().getMonth();

	const events: CalendarEvent[] = [
		{
			id: '1',
			title: 'GPU-1 Замена масла',
			titleEn: 'GPU-1 Oil Change',
			date: new Date(currentYear, currentMonthNum, 22),
			type: 'maintenance',
			engine_id: 'gpu-1',
			description: 'Плановая замена моторного масла и масляного фильтра',
			descriptionEn: 'Scheduled engine oil and filter replacement',
			assignee: 'Алексей Козлов',
			priority: 'medium',
			estimatedDuration: '2 hours'
		},
		{
			id: '2',
			title: 'GPU-2 Свечи зажигания',
			titleEn: 'GPU-2 Spark Plugs',
			date: new Date(currentYear, currentMonthNum, 25),
			type: 'maintenance',
			engine_id: 'gpu-2',
			description: 'Замена свечей зажигания (комплект 24 шт)',
			descriptionEn: 'Spark plug replacement (set of 24)',
			assignee: 'Иван Петров',
			priority: 'high',
			estimatedDuration: '4 hours'
		},
		{
			id: '3',
			title: 'GPU-4 Инспекция',
			titleEn: 'GPU-4 Inspection',
			date: new Date(currentYear, currentMonthNum, 28),
			type: 'inspection',
			engine_id: 'gpu-4',
			description: 'Визуальный осмотр и диагностика после 8000 моточасов',
			descriptionEn: 'Visual inspection and diagnostics after 8000 operating hours',
			assignee: 'Мария Сидорова',
			priority: 'low',
			estimatedDuration: '3 hours'
		},
		{
			id: '4',
			title: 'GPU-3 Капремонт',
			titleEn: 'GPU-3 Overhaul',
			date: new Date(currentYear, currentMonthNum + 1, 5),
			type: 'overhaul',
			engine_id: 'gpu-3',
			description: 'Капитальный ремонт после 24000 моточасов',
			descriptionEn: 'Major overhaul after 24000 operating hours',
			assignee: 'Сервисная бригада',
			priority: 'high',
			estimatedDuration: '5 days'
		},
		{
			id: '5',
			title: 'GPU-2 Простой',
			titleEn: 'GPU-2 Downtime',
			date: new Date(currentYear, currentMonthNum, 20),
			type: 'downtime',
			engine_id: 'gpu-2',
			description: 'Плановый простой для профилактики',
			descriptionEn: 'Scheduled downtime for preventive maintenance',
			priority: 'medium',
			estimatedDuration: '8 hours'
		},
		{
			id: '6',
			title: 'GPU-5 Плановое ТО',
			titleEn: 'GPU-5 Scheduled Maintenance',
			date: new Date(currentYear, currentMonthNum, 19),
			type: 'maintenance',
			engine_id: 'gpu-5',
			description: 'Регулярное техническое обслуживание каждые 2000 моточасов',
			descriptionEn: 'Regular maintenance every 2000 operating hours',
			assignee: 'Алексей Козлов',
			priority: 'medium',
			estimatedDuration: '6 hours'
		},
		{
			id: '7',
			title: 'GPU-1 Проверка вибрации',
			titleEn: 'GPU-1 Vibration Check',
			date: new Date(currentYear, currentMonthNum, 21),
			type: 'inspection',
			engine_id: 'gpu-1',
			description: 'Анализ вибрации и балансировка',
			descriptionEn: 'Vibration analysis and balancing',
			assignee: 'Мария Сидорова',
			priority: 'low',
			estimatedDuration: '1 hour'
		},
		{
			id: '8',
			title: 'GPU-6 Запуск',
			titleEn: 'GPU-6 Startup',
			date: new Date(currentYear, currentMonthNum, 23),
			type: 'maintenance',
			engine_id: 'gpu-6',
			description: 'Ввод в эксплуатацию после планового ремонта',
			descriptionEn: 'Commissioning after scheduled repair',
			assignee: 'Иван Петров',
			priority: 'high',
			estimatedDuration: '2 hours'
		}
	];

	let currentDate = $state(new Date());

	const currentMonth = $derived(currentDate.getMonth());
	const displayYear = $derived(currentDate.getFullYear());

	function getDaysInMonth(month: number, year: number) {
		return new Date(year, month + 1, 0).getDate();
	}

	function getFirstDayOfMonth(month: number, year: number) {
		return new Date(year, month, 1).getDay();
	}

	const calendarDays = $derived.by(() => {
		const daysInMonth = getDaysInMonth(currentMonth, displayYear);
		const firstDay = getFirstDayOfMonth(currentMonth, displayYear);
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
				e.date.getFullYear() === displayYear
			);
		});
	}

	function previousMonth() {
		currentDate = new Date(displayYear, currentMonth - 1, 1);
	}

	function nextMonth() {
		currentDate = new Date(displayYear, currentMonth + 1, 1);
	}

	function isToday(day: number | null) {
		if (!day) return false;
		const today = new Date();
		return (
			day === today.getDate() &&
			currentMonth === today.getMonth() &&
			displayYear === today.getFullYear()
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

	// Get upcoming events (future events sorted by date)
	const upcomingEvents = $derived(
		events
			.filter((e) => e.date >= new Date(new Date().setHours(0, 0, 0, 0)))
			.sort((a, b) => a.date.getTime() - b.date.getTime())
			.slice(0, 5)
	);

	// Modal state
	let showEventModal = $state(false);
	let selectedEvent = $state<CalendarEvent | null>(null);

	function openEventModal(event: CalendarEvent) {
		selectedEvent = event;
		showEventModal = true;
	}

	function closeEventModal() {
		showEventModal = false;
		selectedEvent = null;
	}

	function getEventTypeIcon(type: string) {
		switch (type) {
			case 'maintenance':
				return Wrench;
			case 'inspection':
				return Search;
			case 'overhaul':
				return Settings;
			case 'downtime':
				return AlertTriangle;
			default:
				return CalendarIcon;
		}
	}

	function getEventTypeLabel(type: string) {
		switch (type) {
			case 'maintenance':
				return 'Maintenance';
			case 'inspection':
				return 'Inspection';
			case 'overhaul':
				return 'Overhaul';
			case 'downtime':
				return 'Downtime';
			default:
				return type;
		}
	}

	function getPriorityVariant(priority: string): 'danger' | 'warning' | 'secondary' {
		switch (priority) {
			case 'high':
				return 'danger';
			case 'medium':
				return 'warning';
			default:
				return 'secondary';
		}
	}

	function getStatusVariant(type: string): 'info' | 'success' | 'warning' | 'danger' {
		switch (type) {
			case 'maintenance':
				return 'info';
			case 'inspection':
				return 'success';
			case 'overhaul':
				return 'warning';
			case 'downtime':
				return 'danger';
			default:
				return 'info';
		}
	}

	function markAsCompleted() {
		if (selectedEvent) {
			toastStore.success(
				'Event Completed',
				`${selectedEvent.titleEn} has been marked as completed.`
			);
			closeEventModal();
		}
	}
</script>

<div class="mx-auto max-w-6xl space-y-6">
	<!-- Header -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="flex items-center gap-3 text-2xl font-bold text-white">
				<CalendarIcon class="h-7 w-7 text-cyan-400" />
				{#if !$isLoading}{$_('calendar.title')}{:else}Календарь ТО{/if}
			</h1>
			<p class="mt-1 text-sm text-slate-400">
				{#if !$isLoading}{$_('calendar.subtitle')}{:else}Расписание обслуживания и событий{/if}
			</p>
		</div>
		<button
			type="button"
			class="flex items-center justify-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-600"
		>
			<Plus class="h-4 w-4" />
			{#if !$isLoading}{$_('calendar.addEvent')}{:else}Добавить событие{/if}
		</button>
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
					{#if !$isLoading}
						{$_(`calendar.months.${currentMonth}`)}
					{:else}
						{[
							'Январь',
							'Февраль',
							'Март',
							'Апрель',
							'Май',
							'Июнь',
							'Июль',
							'Август',
							'Сентябрь',
							'Октябрь',
							'Ноябрь',
							'Декабрь'
						][currentMonth]}
					{/if}
					{displayYear}
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
				{#each [0, 1, 2, 3, 4, 5, 6] as dayIndex (dayIndex)}
					<div class="p-2 text-center text-xs font-medium text-slate-500 sm:p-3">
						<span class="hidden sm:inline">
							{#if !$isLoading}{$_(`calendar.days.${dayIndex}`)}{:else}{[
									'Вс',
									'Пн',
									'Вт',
									'Ср',
									'Чт',
									'Пт',
									'Сб'
								][dayIndex]}{/if}
						</span>
						<span class="sm:hidden">
							{#if !$isLoading}{$_(`calendar.daysShort.${dayIndex}`)}{:else}{[
									'Вс',
									'Пн',
									'Вт',
									'Ср',
									'Чт',
									'Пт',
									'Сб'
								][dayIndex]}{/if}
						</span>
					</div>
				{/each}
			</div>

			<!-- Calendar Grid -->
			<div class="grid grid-cols-7">
				{#each calendarDays as day, i (i)}
					{@const dayEvents = getEventsForDay(day)}
					<div
						class={cn(
							'min-h-16 border-r border-b border-white/5 p-1 transition sm:min-h-24 sm:p-2',
							day && 'hover:bg-white/5',
							isToday(day) && 'bg-cyan-500/10'
						)}
					>
						{#if day}
							<div
								class={cn(
									'mb-1 text-xs font-medium sm:text-sm',
									isToday(day) ? 'text-cyan-400' : 'text-slate-400'
								)}
							>
								{day}
							</div>
							<div class="space-y-0.5 sm:space-y-1">
								{#each dayEvents.slice(0, 2) as event (event.id)}
									<button
										type="button"
										class="w-full truncate rounded px-1 py-0.5 text-left text-[10px] text-white transition hover:opacity-80 sm:px-1.5 sm:text-xs {getEventColor(
											event.type
										)}"
										title={event.title}
										onclick={() => openEventModal(event)}
									>
										<span class="hidden sm:inline">{event.title}</span>
										<span class="sm:hidden">{event.engine_id.toUpperCase()}</span>
									</button>
								{/each}
								{#if dayEvents.length > 2}
									<div class="text-[10px] text-slate-500 sm:text-xs">+{dayEvents.length - 2}</div>
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
				<h3 class="mb-4 text-sm font-semibold text-white">
					{#if !$isLoading}{$_('calendar.legend')}{:else}Легенда{/if}
				</h3>
				<div class="space-y-2">
					<div class="flex items-center gap-2 text-xs">
						<div class="h-3 w-3 rounded bg-cyan-500"></div>
						<span class="text-slate-300">
							{#if !$isLoading}{$_('calendar.eventTypes.maintenance')}{:else}Обслуживание{/if}
						</span>
					</div>
					<div class="flex items-center gap-2 text-xs">
						<div class="h-3 w-3 rounded bg-emerald-500"></div>
						<span class="text-slate-300">
							{#if !$isLoading}{$_('calendar.eventTypes.inspection')}{:else}Инспекция{/if}
						</span>
					</div>
					<div class="flex items-center gap-2 text-xs">
						<div class="h-3 w-3 rounded bg-amber-500"></div>
						<span class="text-slate-300">
							{#if !$isLoading}{$_('calendar.eventTypes.overhaul')}{:else}Капремонт{/if}
						</span>
					</div>
					<div class="flex items-center gap-2 text-xs">
						<div class="h-3 w-3 rounded bg-rose-500"></div>
						<span class="text-slate-300">
							{#if !$isLoading}{$_('calendar.eventTypes.downtime')}{:else}Простой{/if}
						</span>
					</div>
				</div>
			</Card>

			<!-- Upcoming Events -->
			<Card>
				<h3 class="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
					<Clock class="h-4 w-4 text-cyan-400" />
					{#if !$isLoading}{$_('calendar.upcoming')}{:else}Предстоящие{/if}
				</h3>
				<div class="space-y-3">
					{#each upcomingEvents as event (event.id)}
						<button
							type="button"
							class="w-full rounded-lg bg-slate-800/50 p-3 text-left transition hover:bg-slate-800"
							onclick={() => openEventModal(event)}
						>
							<div class="mb-1 flex items-center gap-2">
								<div class="h-2 w-2 rounded-full {getEventColor(event.type)}"></div>
								<span class="text-sm font-medium text-white">{event.title}</span>
							</div>
							<div class="text-xs text-slate-500">
								{event.date.toLocaleDateString('ru-RU', {
									day: 'numeric',
									month: 'short',
									year: 'numeric'
								})}
							</div>
						</button>
					{:else}
						<p class="text-sm text-slate-500">
							{#if !$isLoading}{$_('calendar.noEvents')}{:else}Нет предстоящих событий{/if}
						</p>
					{/each}
				</div>
			</Card>
		</div>
	</div>
</div>

<!-- Event Detail Modal -->
<Modal
	open={showEventModal}
	title={selectedEvent?.titleEn || 'Event Details'}
	onclose={closeEventModal}
	size="lg"
>
	{#if selectedEvent}
		{@const TypeIcon = getEventTypeIcon(selectedEvent.type)}
		<div class="space-y-4">
			<!-- Event Type & Priority -->
			<div class="flex flex-wrap items-center gap-2">
				<Badge variant={getStatusVariant(selectedEvent.type)} class="gap-1">
					<TypeIcon class="h-3 w-3" />
					{getEventTypeLabel(selectedEvent.type)}
				</Badge>
				{#if selectedEvent.priority}
					<Badge variant={getPriorityVariant(selectedEvent.priority)}>
						{selectedEvent.priority.charAt(0).toUpperCase() + selectedEvent.priority.slice(1)} Priority
					</Badge>
				{/if}
			</div>

			<!-- Engine ID -->
			<div class="flex items-center gap-3 rounded-lg bg-slate-800/50 p-3">
				<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/20">
					<Settings class="h-5 w-5 text-cyan-400" />
				</div>
				<div>
					<div class="text-xs text-slate-500">Engine</div>
					<div class="font-semibold text-white uppercase">{selectedEvent.engine_id}</div>
				</div>
			</div>

			<!-- Description -->
			{#if selectedEvent.descriptionEn}
				<div class="space-y-1">
					<div class="flex items-center gap-2 text-sm text-slate-400">
						<FileText class="h-4 w-4" />
						Description
					</div>
					<p class="text-sm text-slate-300">{selectedEvent.descriptionEn}</p>
				</div>
			{/if}

			<!-- Details Grid -->
			<div class="grid grid-cols-2 gap-4">
				<!-- Date -->
				<div class="space-y-1">
					<div class="flex items-center gap-2 text-xs text-slate-500">
						<CalendarIcon class="h-3 w-3" />
						Scheduled Date
					</div>
					<div class="text-sm font-medium text-white">
						{selectedEvent.date.toLocaleDateString('en-US', {
							weekday: 'long',
							month: 'long',
							day: 'numeric',
							year: 'numeric'
						})}
					</div>
				</div>

				<!-- Duration -->
				{#if selectedEvent.estimatedDuration}
					<div class="space-y-1">
						<div class="flex items-center gap-2 text-xs text-slate-500">
							<Clock class="h-3 w-3" />
							Estimated Duration
						</div>
						<div class="text-sm font-medium text-white">{selectedEvent.estimatedDuration}</div>
					</div>
				{/if}

				<!-- Assignee -->
				{#if selectedEvent.assignee}
					<div class="space-y-1">
						<div class="flex items-center gap-2 text-xs text-slate-500">
							<User class="h-3 w-3" />
							Assignee
						</div>
						<div class="text-sm font-medium text-white">{selectedEvent.assignee}</div>
					</div>
				{/if}

				<!-- Location -->
				<div class="space-y-1">
					<div class="flex items-center gap-2 text-xs text-slate-500">
						<MapPin class="h-3 w-3" />
						Location
					</div>
					<div class="text-sm font-medium text-white">
						Engine Hall, Bay {selectedEvent.engine_id.split('-')[1]}
					</div>
				</div>
			</div>

			<!-- Actions -->
			<div class="flex justify-end gap-3 border-t border-white/5 pt-4">
				<Button variant="secondary" onclick={closeEventModal}>Close</Button>
				<Button class="gap-2" onclick={markAsCompleted}>
					<CheckCircle class="h-4 w-4" />
					Mark as Completed
				</Button>
			</div>
		</div>
	{/if}
</Modal>
