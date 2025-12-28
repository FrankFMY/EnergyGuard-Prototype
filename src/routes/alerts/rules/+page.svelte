<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { Card, Badge, Button } from '$lib/components/ui/index.js';
	import { cn } from '$lib/utils.js';
	import Settings from 'lucide-svelte/icons/settings';
	import ArrowLeft from 'lucide-svelte/icons/arrow-left';
	import Bell from 'lucide-svelte/icons/bell';
	import Mail from 'lucide-svelte/icons/mail';
	import Smartphone from 'lucide-svelte/icons/smartphone';
	import BellRing from 'lucide-svelte/icons/bell-ring';
	import Plus from 'lucide-svelte/icons/plus';
	import { getAlertRules, toggleAlertRule } from '$lib/services/alerts.service.js';
	import type { AlertRule } from '$lib/types/alert.js';

	let rules: AlertRule[] = $state([]);
	let loading = $state(true);

	async function loadRules() {
		loading = true;
		try {
			rules = await getAlertRules();
		} finally {
			loading = false;
		}
	}

	async function handleToggle(ruleId: string) {
		await toggleAlertRule(ruleId);
		await loadRules();
	}

	onMount(() => {
		loadRules();
	});

	function getOperatorLabel(op: string) {
		switch (op) {
			case 'gt':
				return '>';
			case 'lt':
				return '<';
			case 'gte':
				return '≥';
			case 'lte':
				return '≤';
			case 'eq':
				return '=';
			default:
				return op;
		}
	}

	function getMetricLabel(metric: string) {
		switch (metric) {
			case 'temp_exhaust':
				return 'Exhaust Temperature';
			case 'vibration':
				return 'Vibration';
			case 'power_kw':
				return 'Power Output';
			case 'gas_pressure':
				return 'Gas Pressure';
			case 'total_hours':
				return 'Operating Hours';
			default:
				return metric;
		}
	}

	function getSeverityColor(severity: string) {
		switch (severity) {
			case 'critical':
				return 'danger';
			case 'warning':
				return 'warning';
			default:
				return 'info';
		}
	}
</script>

<div class="mx-auto max-w-4xl space-y-6">
	<!-- Header -->
	<div class="flex items-center gap-4">
		<a
			href="{base}/alerts"
			class="rounded-lg p-2 text-slate-400 transition hover:bg-white/5 hover:text-white"
		>
			<ArrowLeft class="h-5 w-5" />
		</a>
		<div>
			<h1 class="flex items-center gap-3 text-2xl font-bold text-white">
				<Settings class="h-7 w-7 text-cyan-400" />
				Alert Rules
			</h1>
			<p class="mt-1 text-sm text-slate-400">Configure alert thresholds and notifications</p>
		</div>
	</div>

	<!-- Add Rule Button -->
	<div class="flex justify-end">
		<Button class="gap-2" disabled>
			<Plus class="h-4 w-4" />
			Add Rule
		</Button>
	</div>

	<!-- Rules List -->
	<div class="space-y-4">
		{#if loading}
			{#each Array(3) as _}
				<Card class="animate-pulse">
					<div class="h-20"></div>
				</Card>
			{/each}
		{:else}
			{#each rules as rule (rule.id)}
				<Card class={cn('transition', !rule.enabled && 'opacity-50')}>
					<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
						<div class="flex-1">
							<div class="mb-2 flex items-center gap-3">
								<h3 class="font-semibold text-white">{rule.name}</h3>
								<Badge variant={getSeverityColor(rule.severity)}>
									{rule.severity}
								</Badge>
								{#if rule.engine_id}
									<Badge variant="default">{rule.engine_id.toUpperCase()}</Badge>
								{:else}
									<Badge variant="secondary">All Engines</Badge>
								{/if}
							</div>

							<div class="mb-3 text-sm text-slate-400">
								<span class="font-medium text-slate-300">{getMetricLabel(rule.metric)}</span>
								<span class="mx-2 font-mono text-cyan-400">{getOperatorLabel(rule.operator)}</span>
								<span class="font-mono text-white">{rule.threshold}</span>
								<span class="ml-2 text-slate-500">for {rule.duration_seconds}s</span>
							</div>

							<div class="flex items-center gap-4">
								<div
									class={cn(
										'flex items-center gap-1 text-xs',
										rule.notify_email ? 'text-cyan-400' : 'text-slate-600'
									)}
								>
									<Mail class="h-3.5 w-3.5" />
									Email
								</div>
								<div
									class={cn(
										'flex items-center gap-1 text-xs',
										rule.notify_sms ? 'text-cyan-400' : 'text-slate-600'
									)}
								>
									<Smartphone class="h-3.5 w-3.5" />
									SMS
								</div>
								<div
									class={cn(
										'flex items-center gap-1 text-xs',
										rule.notify_push ? 'text-cyan-400' : 'text-slate-600'
									)}
								>
									<BellRing class="h-3.5 w-3.5" />
									Push
								</div>
							</div>
						</div>

						<div class="flex items-center gap-3">
							<button
								type="button"
								class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:outline-hidden {rule.enabled
									? 'bg-cyan-500'
									: 'bg-slate-700'}"
								onclick={() => handleToggle(rule.id)}
								aria-label="Toggle rule"
							>
								<span
									class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out {rule.enabled
										? 'translate-x-5'
										: 'translate-x-0'}"
								></span>
							</button>
						</div>
					</div>
				</Card>
			{/each}
		{/if}
	</div>

	<!-- Info Card -->
	<Card class="border-cyan-500/20 bg-cyan-500/5">
		<div class="flex gap-4">
			<Bell class="h-5 w-5 shrink-0 text-cyan-400" />
			<div class="text-sm text-slate-300">
				<p class="mb-2 font-medium">How Alert Rules Work</p>
				<p class="text-slate-400">
					When a metric crosses the defined threshold for the specified duration, an alert is
					triggered. Notifications are sent based on the configured channels. Critical alerts always
					trigger immediate notifications.
				</p>
			</div>
		</div>
	</Card>
</div>
