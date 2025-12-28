<script lang="ts">
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { base } from '$app/paths';
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

	// Filters
	let severityFilter = $state<AlertSeverity | ''>('');
	let statusFilter = $state<AlertStatus | ''>('');
	let timeFilter = $state<number>(24);

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

		if (diffMins < 60) return `${diffMins}m ago`;
		if (diffHours < 24) return `${diffHours}h ago`;
		return date.toLocaleDateString();
	}
</script>

<div class="mx-auto max-w-6xl space-y-6">
	<!-- Header -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="flex items-center gap-3 text-2xl font-bold text-white">
				<Bell class="h-7 w-7 text-cyan-400" />
				Alert Center
			</h1>
			<p class="mt-1 text-sm text-slate-400">Monitor and manage system alerts</p>
		</div>
		<div class="flex items-center gap-2">
			<a href="{base}/alerts/rules">
				<Button variant="outline" class="gap-2">
					<Filter class="h-4 w-4" />
					Alert Rules
				</Button>
			</a>
			<Button variant="ghost" onclick={loadData} disabled={loading} class="gap-2">
				<RefreshCw class={cn('h-4 w-4', loading && 'animate-spin')} />
			</Button>
		</div>
	</div>

	<!-- Stats Cards -->
	<div class="grid grid-cols-2 gap-4 md:grid-cols-4">
		<Card class="text-center">
			<div class="text-3xl font-bold text-white">{stats.active}</div>
			<div class="text-xs text-slate-400">Active Alerts</div>
		</Card>
		<Card class="text-center">
			<div class="text-3xl font-bold text-rose-400">{stats.critical}</div>
			<div class="text-xs text-slate-400">Critical</div>
		</Card>
		<Card class="text-center">
			<div class="text-3xl font-bold text-amber-400">{stats.warning}</div>
			<div class="text-xs text-slate-400">Warnings</div>
		</Card>
		<Card class="text-center">
			<div class="text-3xl font-bold text-emerald-400">{stats.resolved}</div>
			<div class="text-xs text-slate-400">Resolved (24h)</div>
		</Card>
	</div>

	<!-- Filters -->
	<Card class="flex flex-wrap items-center gap-4 p-4">
		<div class="flex items-center gap-2 text-sm text-slate-400">
			<Filter class="h-4 w-4" />
			Filters:
		</div>

		<select
			bind:value={severityFilter}
			onchange={loadData}
			class="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-white"
		>
			<option value="">All Severities</option>
			<option value="critical">Critical</option>
			<option value="warning">Warning</option>
			<option value="info">Info</option>
		</select>

		<select
			bind:value={statusFilter}
			onchange={loadData}
			class="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-white"
		>
			<option value="">All Statuses</option>
			<option value="active">Active</option>
			<option value="acknowledged">Acknowledged</option>
			<option value="resolved">Resolved</option>
		</select>

		<select
			bind:value={timeFilter}
			onchange={loadData}
			class="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-white"
		>
			<option value={1}>Last Hour</option>
			<option value={6}>Last 6 Hours</option>
			<option value={24}>Last 24 Hours</option>
			<option value={168}>Last 7 Days</option>
		</select>
	</Card>

	<!-- Alerts List -->
	<div class="space-y-3">
		{#if loading}
			{#each Array(3) as _}
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
				<p class="text-slate-400">No alerts match your filters</p>
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
								<h3 class="font-semibold text-white">{alert.title}</h3>
								<Badge variant={getStatusBadge(alert.status)}>
									{alert.status}
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

							<div class="flex flex-wrap items-center gap-4 text-xs text-slate-500">
								<span class="flex items-center gap-1">
									<Clock class="h-3 w-3" />
									{formatTime(alert.created_at)}
								</span>
								{#if alert.actual_value !== null && alert.threshold !== null}
									<span>
										Value: <span class="font-mono text-white">{alert.actual_value}</span>
										/ Threshold: <span class="font-mono">{alert.threshold}</span>
									</span>
								{/if}
								{#if alert.acknowledged_by}
									<span>Ack by: {alert.acknowledged_by}</span>
								{/if}
							</div>
						</div>

						<!-- Actions -->
						{#if alert.status !== 'resolved'}
							<div class="flex shrink-0 gap-2">
								{#if alert.status === 'active'}
									<Button
										variant="outline"
										size="sm"
										onclick={() => handleAcknowledge(alert.id)}
										disabled={actionLoading === alert.id}
									>
										{actionLoading === alert.id ? 'Loading...' : 'Acknowledge'}
									</Button>
								{/if}
								<Button
									variant="primary"
									size="sm"
									onclick={() => handleResolve(alert.id)}
									disabled={actionLoading === alert.id}
								>
									{actionLoading === alert.id ? 'Loading...' : 'Resolve'}
								</Button>
							</div>
						{/if}
					</div>
				</Card>
			{/each}
		{/if}
	</div>
</div>
