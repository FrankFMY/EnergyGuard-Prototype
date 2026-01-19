<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { _ } from 'svelte-i18n';
	import { Card, Badge, Button } from '$lib/components/ui/index.js';
	import { cn } from '$lib/utils.js';
	import Bell from 'lucide-svelte/icons/bell';
	import AlertTriangle from 'lucide-svelte/icons/alert-triangle';
	import AlertCircle from 'lucide-svelte/icons/alert-circle';
	import Info from 'lucide-svelte/icons/info';
	import CheckCircle from 'lucide-svelte/icons/check-circle';
	import Clock from 'lucide-svelte/icons/clock';
	import Filter from 'lucide-svelte/icons/filter';
	import RefreshCw from 'lucide-svelte/icons/refresh-cw';
	import ChevronDown from 'lucide-svelte/icons/chevron-down';
	import {
		getAlerts,
		getAlertStats,
		acknowledgeAlert,
		resolveAlert
	} from '$lib/services/alerts.service.js';
	import type { AlertDisplay, AlertSeverity, AlertStatus } from '$lib/types/alert.js';

	let alerts: AlertDisplay[] = $state([]);
	let stats = $state({
		total: 0,
		active: 0,
		acknowledged: 0,
		resolved: 0,
		critical: 0,
		warning: 0
	});
	let loading = $state(true);
	let actionLoading = $state<string | null>(null);
	let filtersExpanded = $state(false);

	// Filters
	let severityFilter = $state<AlertSeverity | ''>('');
	let statusFilter = $state<AlertStatus | ''>('');
	let timeFilter = $state<number>(168); // Default to 7 days

	// Check if any filter is active
	const hasActiveFilters = $derived(
		severityFilter !== '' || statusFilter !== '' || timeFilter !== 168
	);

	async function loadData() {
		loading = true;
		try {
			const [alertsData, statsData] = await Promise.all([
				getAlerts({
					severity: severityFilter || undefined,
					status: statusFilter || undefined,
					hours: timeFilter
				}),
				getAlertStats()
			]);
			alerts = alertsData;
			stats = statsData;
		} catch (e) {
			console.error(e);
		} finally {
			loading = false;
		}
	}

	async function handleAcknowledge(alertId: string) {
		actionLoading = alertId;
		try {
			await acknowledgeAlert(alertId);
			await loadData();
		} finally {
			actionLoading = null;
		}
	}

	async function handleResolve(alertId: string) {
		actionLoading = alertId;
		try {
			await resolveAlert(alertId);
			await loadData();
		} finally {
			actionLoading = null;
		}
	}

	function clearFilters() {
		severityFilter = '';
		statusFilter = '';
		timeFilter = 168;
		loadData();
	}

	onMount(() => {
		loadData();
	});

	function getSeverityIcon(severity: AlertSeverity) {
		switch (severity) {
			case 'critical':
				return AlertTriangle;
			case 'warning':
				return AlertCircle;
			default:
				return Info;
		}
	}

	function getSeverityColor(severity: AlertSeverity) {
		switch (severity) {
			case 'critical':
				return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
			case 'warning':
				return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
			default:
				return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
		}
	}

	function getStatusBadge(status: AlertStatus) {
		switch (status) {
			case 'active':
				return 'danger';
			case 'acknowledged':
				return 'warning';
			default:
				return 'success';
		}
	}

	function formatTime(isoString: string) {
		const date = new Date(isoString);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMins / 60);

		if (diffMins < 60) return `${diffMins} ${$_('alerts.minutesAgo')}`;
		if (diffHours < 24) return `${diffHours} ${$_('alerts.hoursAgo')}`;
		return date.toLocaleDateString();
	}
</script>

<div class="mx-auto max-w-6xl space-y-4 sm:space-y-6">
	<!-- Header -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="flex items-center gap-2 text-xl font-bold text-white sm:gap-3 sm:text-2xl">
				<Bell class="h-6 w-6 text-cyan-400 sm:h-7 sm:w-7" />
				{$_('alerts.title')}
			</h1>
			<p class="mt-1 text-sm text-slate-400">{$_('alerts.subtitle')}</p>
		</div>
		<div class="flex items-center gap-2">
			<a href="{base}/alerts/rules">
				<Button variant="outline" size="sm" class="gap-2">
					<Filter class="h-4 w-4" />
					<span class="hidden sm:inline">{$_('alerts.rules')}</span>
				</Button>
			</a>
			<Button variant="ghost" size="sm" onclick={loadData} disabled={loading} class="gap-2">
				<RefreshCw class={cn('h-4 w-4', loading && 'animate-spin')} />
			</Button>
		</div>
	</div>

	<!-- Stats Cards -->
	<div class="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
		<Card class="p-3 text-center sm:p-4">
			<div class="text-2xl font-bold text-white sm:text-3xl">{stats.active}</div>
			<div class="text-xs text-slate-400">{$_('alerts.active')}</div>
		</Card>
		<Card class="p-3 text-center sm:p-4">
			<div class="text-2xl font-bold text-rose-400 sm:text-3xl">{stats.critical}</div>
			<div class="text-xs text-slate-400">{$_('alerts.critical')}</div>
		</Card>
		<Card class="p-3 text-center sm:p-4">
			<div class="text-2xl font-bold text-amber-400 sm:text-3xl">{stats.warning}</div>
			<div class="text-xs text-slate-400">{$_('alerts.warnings')}</div>
		</Card>
		<Card class="p-3 text-center sm:p-4">
			<div class="text-2xl font-bold text-emerald-400 sm:text-3xl">{stats.resolved}</div>
			<div class="text-xs text-slate-400">{$_('alerts.resolved24h')}</div>
		</Card>
	</div>

	<!-- Filters - Mobile Collapsible / Desktop Inline -->
	<Card class="overflow-hidden p-0">
		<!-- Mobile Filter Toggle -->
		<button
			type="button"
			class="flex w-full items-center justify-between p-3 sm:hidden"
			onclick={() => (filtersExpanded = !filtersExpanded)}
		>
			<div class="flex items-center gap-2 text-sm font-medium text-slate-300">
				<Filter class="h-4 w-4 text-slate-400" />
				{$_('alerts.filters')}
				{#if hasActiveFilters}
					<Badge variant="info" class="ml-1">{$_('alerts.filtersActive')}</Badge>
				{/if}
			</div>
			<ChevronDown
				class={cn('h-5 w-5 text-slate-400 transition-transform', filtersExpanded && 'rotate-180')}
			/>
		</button>

		<!-- Filter Controls -->
		<div
			class={cn(
				'border-t border-white/5 p-3 sm:border-t-0 sm:p-4',
				!filtersExpanded && 'hidden sm:block'
			)}
		>
			<!-- Desktop: Inline layout -->
			<div class="hidden items-center gap-4 sm:flex">
				<div class="flex items-center gap-2 text-sm text-slate-400">
					<Filter class="h-4 w-4" />
					{$_('alerts.filters')}:
				</div>

				<select
					bind:value={severityFilter}
					onchange={loadData}
					class="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-white transition-colors hover:border-slate-600 focus:border-cyan-500 focus:outline-none"
				>
					<option value="">{$_('alerts.allLevels')}</option>
					<option value="critical">{$_('alerts.critical')}</option>
					<option value="warning">{$_('alerts.warnings')}</option>
					<option value="info">{$_('alerts.info')}</option>
				</select>

				<select
					bind:value={statusFilter}
					onchange={loadData}
					class="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-white transition-colors hover:border-slate-600 focus:border-cyan-500 focus:outline-none"
				>
					<option value="">{$_('alerts.allStatuses')}</option>
					<option value="active">{$_('alerts.active')}</option>
					<option value="acknowledged">{$_('alerts.acknowledged')}</option>
					<option value="resolved">{$_('alerts.resolvedStatus')}</option>
				</select>

				<select
					bind:value={timeFilter}
					onchange={loadData}
					class="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-white transition-colors hover:border-slate-600 focus:border-cyan-500 focus:outline-none"
				>
					<option value={1}>{$_('alerts.lastHour')}</option>
					<option value={6}>{$_('alerts.last6Hours')}</option>
					<option value={24}>{$_('alerts.last24Hours')}</option>
					<option value={168}>{$_('alerts.last7Days')}</option>
				</select>

				{#if hasActiveFilters}
					<button
						type="button"
						class="text-xs text-cyan-400 hover:underline"
						onclick={clearFilters}
					>
						{$_('alerts.clearFilters')}
					</button>
				{/if}
			</div>

			<!-- Mobile: Grid layout -->
			<div class="grid grid-cols-1 gap-3 sm:hidden">
				<div>
					<label
						for="mobile-severity-filter"
						class="mb-1.5 block text-xs font-medium text-slate-500">{$_('alerts.severity')}</label
					>
					<select
						id="mobile-severity-filter"
						bind:value={severityFilter}
						onchange={loadData}
						class="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white"
					>
						<option value="">{$_('alerts.allLevels')}</option>
						<option value="critical">{$_('alerts.critical')}</option>
						<option value="warning">{$_('alerts.warnings')}</option>
						<option value="info">{$_('alerts.info')}</option>
					</select>
				</div>

				<div>
					<label for="mobile-status-filter" class="mb-1.5 block text-xs font-medium text-slate-500"
						>{$_('alerts.statusLabel')}</label
					>
					<select
						id="mobile-status-filter"
						bind:value={statusFilter}
						onchange={loadData}
						class="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white"
					>
						<option value="">{$_('alerts.allStatuses')}</option>
						<option value="active">{$_('alerts.active')}</option>
						<option value="acknowledged">{$_('alerts.acknowledged')}</option>
						<option value="resolved">{$_('alerts.resolvedStatus')}</option>
					</select>
				</div>

				<div>
					<label for="mobile-time-filter" class="mb-1.5 block text-xs font-medium text-slate-500"
						>{$_('alerts.period')}</label
					>
					<select
						id="mobile-time-filter"
						bind:value={timeFilter}
						onchange={loadData}
						class="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white"
					>
						<option value={1}>{$_('alerts.lastHour')}</option>
						<option value={6}>{$_('alerts.last6Hours')}</option>
						<option value={24}>{$_('alerts.last24Hours')}</option>
						<option value={168}>{$_('alerts.last7Days')}</option>
					</select>
				</div>

				{#if hasActiveFilters}
					<button
						type="button"
						class="mt-1 w-full rounded-lg border border-slate-700 py-2 text-sm text-cyan-400 transition-colors hover:bg-white/5"
						onclick={clearFilters}
					>
						{$_('alerts.clearFilters')}
					</button>
				{/if}
			</div>
		</div>
	</Card>

	<!-- Alerts List -->
	<div class="space-y-3">
		{#if loading}
			{#each { length: 3 } as _item, i (i)}
				<Card class="animate-pulse">
					<div class="flex gap-4">
						<div class="h-10 w-10 rounded-lg bg-slate-800"></div>
						<div class="flex-1 space-y-2">
							<div class="h-4 w-1/3 rounded bg-slate-800"></div>
							<div class="h-3 w-2/3 rounded bg-slate-800"></div>
						</div>
					</div>
				</Card>
			{/each}
		{:else if alerts.length === 0}
			<Card class="py-12 text-center">
				<CheckCircle class="mx-auto mb-4 h-12 w-12 text-emerald-400/50" />
				<p class="text-slate-400">{$_('alerts.noAlerts')}</p>
			</Card>
		{:else}
			{#each alerts as alert (alert.id)}
				{@const SeverityIcon = getSeverityIcon(alert.severity)}
				<Card
					class={cn(
						'transition hover:bg-white/5',
						alert.status === 'active' && alert.severity === 'critical' && 'border-rose-500/50'
					)}
				>
					<div class="flex flex-col gap-4 sm:flex-row sm:items-start">
						<!-- Icon -->
						<div
							class={cn(
								'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border',
								getSeverityColor(alert.severity),
								alert.status === 'active' && alert.severity === 'critical' && 'animate-pulse'
							)}
						>
							<SeverityIcon class="h-5 w-5" />
						</div>

						<!-- Content -->
						<div class="min-w-0 flex-1">
							<div class="mb-1 flex flex-wrap items-center gap-2">
								<h3 class="text-sm font-semibold text-white sm:text-base">{alert.title}</h3>
								<Badge variant={getStatusBadge(alert.status)}>
									{$_(`alerts.status.${alert.status}`)}
								</Badge>
								{#if alert.engine_id}
									<a
										href="{base}/engine/{alert.engine_id}"
										class="text-xs font-medium text-cyan-400 hover:underline"
									>
										{alert.engine_id.toUpperCase()}
									</a>
								{/if}
							</div>

							<p class="mb-2 text-sm text-slate-400">{alert.message}</p>

							<div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
								<span class="flex items-center gap-1">
									<Clock class="h-3 w-3" />
									{formatTime(alert.created_at)}
								</span>
								{#if alert.actual_value !== null && alert.threshold !== null}
									<span class="hidden sm:inline">
										{$_('alerts.value')}:
										<span class="font-mono text-white">{alert.actual_value}</span>
										/ {$_('alerts.threshold')}: <span class="font-mono">{alert.threshold}</span>
									</span>
								{/if}
								{#if alert.acknowledged_by}
									<span class="hidden sm:inline"
										>{$_('alerts.acknowledgedBy')}: {alert.acknowledged_by}</span
									>
								{/if}
							</div>
						</div>

						<!-- Actions -->
						{#if alert.status !== 'resolved'}
							<div class="flex w-full shrink-0 gap-2 sm:w-auto">
								{#if alert.status === 'active'}
									<Button
										variant="outline"
										size="sm"
										class="flex-1 sm:flex-initial"
										onclick={() => handleAcknowledge(alert.id)}
										disabled={actionLoading === alert.id}
									>
										{actionLoading === alert.id ? '...' : $_('alerts.acknowledge')}
									</Button>
								{/if}
								<Button
									variant="primary"
									size="sm"
									class="flex-1 sm:flex-initial"
									onclick={() => handleResolve(alert.id)}
									disabled={actionLoading === alert.id}
								>
									{actionLoading === alert.id ? '...' : $_('alerts.resolve')}
								</Button>
							</div>
						{/if}
					</div>
				</Card>
			{/each}
		{/if}
	</div>
</div>
