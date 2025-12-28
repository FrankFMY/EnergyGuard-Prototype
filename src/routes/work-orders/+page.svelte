<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { Card, Badge, Button } from '$lib/components/ui/index.js';
	import { cn } from '$lib/utils.js';
	import ClipboardList from 'lucide-svelte/icons/clipboard-list';
	import Plus from 'lucide-svelte/icons/plus';
	import Filter from 'lucide-svelte/icons/filter';
	import Clock from 'lucide-svelte/icons/clock';
	import User from 'lucide-svelte/icons/user';
	import Wrench from 'lucide-svelte/icons/wrench';
	import AlertTriangle from 'lucide-svelte/icons/alert-triangle';
	import CheckCircle from 'lucide-svelte/icons/check-circle';
	import Play from 'lucide-svelte/icons/play';
	import {
		getWorkOrders,
		getWorkOrderStats,
		updateWorkOrderStatus
	} from '$lib/services/workorders.service.js';
	import type { WorkOrder, WorkOrderStatus } from '$lib/types/workorder.js';

	let workOrders: WorkOrder[] = $state([]);
	let stats = $state({ total: 0, open: 0, in_progress: 0, completed: 0, critical: 0 });
	let loading = $state(true);
	let statusFilter = $state<WorkOrderStatus | ''>('');

	async function loadData() {
		loading = true;
		try {
			const [ordersData, statsData] = await Promise.all([
				getWorkOrders({ status: statusFilter || undefined }),
				getWorkOrderStats()
			]);
			workOrders = ordersData;
			stats = statsData;
		} finally {
			loading = false;
		}
	}

	async function handleStatusChange(workOrderId: string, newStatus: WorkOrderStatus) {
		await updateWorkOrderStatus(workOrderId, newStatus);
		await loadData();
	}

	onMount(() => {
		loadData();
	});

	function getPriorityBadge(priority: string) {
		switch (priority) {
			case 'critical':
				return 'danger';
			case 'high':
				return 'warning';
			case 'medium':
				return 'info';
			default:
				return 'secondary';
		}
	}

	function getStatusBadge(status: WorkOrderStatus) {
		switch (status) {
			case 'open':
				return 'default';
			case 'in_progress':
				return 'warning';
			case 'completed':
				return 'success';
			default:
				return 'secondary';
		}
	}

	function formatDate(isoString: string | null) {
		if (!isoString) return '-';
		return new Date(isoString).toLocaleDateString();
	}

	function isOverdue(dueDate: string | null, status: WorkOrderStatus) {
		if (!dueDate || status === 'completed' || status === 'cancelled') return false;
		return new Date(dueDate) < new Date();
	}
</script>

<div class="mx-auto max-w-6xl space-y-6">
	<!-- Header -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="flex items-center gap-3 text-2xl font-bold text-white">
				<ClipboardList class="h-7 w-7 text-cyan-400" />
				Work Orders
			</h1>
			<p class="mt-1 text-sm text-slate-400">Manage maintenance tasks and assignments</p>
		</div>
		<Button class="gap-2" disabled>
			<Plus class="h-4 w-4" />
			New Work Order
		</Button>
	</div>

	<!-- Stats Cards -->
	<div class="grid grid-cols-2 gap-4 md:grid-cols-5">
		<Card
			class="cursor-pointer text-center transition hover:bg-white/5"
			onclick={() => {
				statusFilter = '';
				loadData();
			}}
		>
			<div class="text-3xl font-bold text-white">{stats.total}</div>
			<div class="text-xs text-slate-400">Total</div>
		</Card>
		<Card
			class="cursor-pointer text-center transition hover:bg-white/5"
			onclick={() => {
				statusFilter = 'open';
				loadData();
			}}
		>
			<div class="text-3xl font-bold text-blue-400">{stats.open}</div>
			<div class="text-xs text-slate-400">Open</div>
		</Card>
		<Card
			class="cursor-pointer text-center transition hover:bg-white/5"
			onclick={() => {
				statusFilter = 'in_progress';
				loadData();
			}}
		>
			<div class="text-3xl font-bold text-amber-400">{stats.in_progress}</div>
			<div class="text-xs text-slate-400">In Progress</div>
		</Card>
		<Card
			class="cursor-pointer text-center transition hover:bg-white/5"
			onclick={() => {
				statusFilter = 'completed';
				loadData();
			}}
		>
			<div class="text-3xl font-bold text-emerald-400">{stats.completed}</div>
			<div class="text-xs text-slate-400">Completed</div>
		</Card>
		<Card class="text-center">
			<div class="text-3xl font-bold text-rose-400">{stats.critical}</div>
			<div class="text-xs text-slate-400">Critical</div>
		</Card>
	</div>

	<!-- Filters -->
	<Card class="flex flex-wrap items-center gap-4 p-4">
		<div class="flex items-center gap-2 text-sm text-slate-400">
			<Filter class="h-4 w-4" />
			Filter:
		</div>
		<select
			bind:value={statusFilter}
			onchange={loadData}
			class="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-white"
		>
			<option value="">All Statuses</option>
			<option value="open">Open</option>
			<option value="in_progress">In Progress</option>
			<option value="completed">Completed</option>
		</select>
	</Card>

	<!-- Work Orders List -->
	<div class="space-y-4">
		{#if loading}
			{#each Array(3) as _}
				<Card class="animate-pulse">
					<div class="h-24"></div>
				</Card>
			{/each}
		{:else if workOrders.length === 0}
			<Card class="py-12 text-center">
				<CheckCircle class="mx-auto mb-4 h-12 w-12 text-emerald-400/50" />
				<p class="text-slate-400">No work orders match your filters</p>
			</Card>
		{:else}
			{#each workOrders as wo (wo.id)}
				<Card
					class={cn(
						'transition hover:bg-white/5',
						isOverdue(wo.due_date, wo.status) && 'border-rose-500/50'
					)}
				>
					<div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
						<div class="flex-1">
							<div class="mb-2 flex flex-wrap items-center gap-2">
								<h3 class="font-semibold text-white">{wo.title}</h3>
								<Badge variant={getStatusBadge(wo.status)}>{wo.status.replace('_', ' ')}</Badge>
								<Badge variant={getPriorityBadge(wo.priority)}>{wo.priority}</Badge>
								{#if isOverdue(wo.due_date, wo.status)}
									<Badge variant="danger">
										<AlertTriangle class="h-3 w-3" />
										Overdue
									</Badge>
								{/if}
							</div>

							<p class="mb-3 text-sm text-slate-400">{wo.description}</p>

							<div class="flex flex-wrap items-center gap-4 text-xs text-slate-500">
								{#if wo.engine_id}
									<a
										href="{base}/engine/{wo.engine_id}"
										class="flex items-center gap-1 text-cyan-400 hover:underline"
									>
										<Wrench class="h-3 w-3" />
										{wo.engine_id.toUpperCase()}
									</a>
								{/if}
								<span class="flex items-center gap-1">
									<Clock class="h-3 w-3" />
									Due: {formatDate(wo.due_date)}
								</span>
								{#if wo.assigned_to}
									<span class="flex items-center gap-1">
										<User class="h-3 w-3" />
										{wo.assigned_to}
									</span>
								{:else}
									<span class="flex items-center gap-1 text-amber-400">
										<User class="h-3 w-3" />
										Unassigned
									</span>
								{/if}
								{#if wo.estimated_hours}
									<span>Est: {wo.estimated_hours}h</span>
								{/if}
							</div>

							{#if wo.parts_required.length > 0}
								<div class="mt-3 flex flex-wrap gap-2">
									{#each wo.parts_required as part}
										<span class="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
											{part}
										</span>
									{/each}
								</div>
							{/if}
						</div>

						<!-- Actions -->
						{#if wo.status !== 'completed' && wo.status !== 'cancelled'}
							<div class="flex shrink-0 gap-2">
								{#if wo.status === 'open'}
									<Button
										variant="outline"
										size="sm"
										onclick={() => handleStatusChange(wo.id, 'in_progress')}
										class="gap-1"
									>
										<Play class="h-3 w-3" />
										Start
									</Button>
								{/if}
								{#if wo.status === 'in_progress'}
									<Button
										variant="primary"
										size="sm"
										onclick={() => handleStatusChange(wo.id, 'completed')}
										class="gap-1"
									>
										<CheckCircle class="h-3 w-3" />
										Complete
									</Button>
								{/if}
							</div>
						{/if}
					</div>
				</Card>
			{/each}
		{/if}
	</div>
</div>
