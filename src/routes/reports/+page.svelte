<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { Card, Button, Badge } from '$lib/components/ui/index.js';
	import FileText from 'lucide-svelte/icons/file-text';
	import Download from 'lucide-svelte/icons/download';
	import BarChart3 from 'lucide-svelte/icons/bar-chart-3';
	import Calendar from 'lucide-svelte/icons/calendar';
	import CheckCircle from 'lucide-svelte/icons/check-circle';

	const reports = [
		{
			id: 'daily',
			title: 'Daily Operational Summary',
			description: 'Power generation, efficiency metrics, and event logs for the last 24 hours.',
			type: 'Daily',
			format: 'PDF',
			icon: FileText,
			color: 'text-cyan-400',
			bg: 'bg-cyan-500/10'
		},
		{
			id: 'monthly_eco',
			title: 'Monthly Economic Analysis',
			description: 'Detailed cost breakdown, profitability analysis, and budget forecast.',
			type: 'Monthly',
			format: 'PDF',
			icon: BarChart3,
			color: 'text-emerald-400',
			bg: 'bg-emerald-500/10'
		},
		{
			id: 'maintenance',
			title: 'Maintenance Log 2024',
			description: 'Complete history of maintenance activities, parts replacement, and downtime.',
			type: 'Annual',
			format: 'CSV',
			icon: Calendar,
			color: 'text-amber-400',
			bg: 'bg-amber-500/10'
		}
	];

	let generating: string | null = $state(null);
	let completed: string | null = $state(null);

	function generateReport(reportId: string) {
		generating = reportId;
		completed = null;

		// Mock generation
		setTimeout(() => {
			generating = null;
			completed = reportId;
			setTimeout(() => {
				completed = null;
			}, 3000);
		}, 2000);
	}
</script>

<div class="mx-auto max-w-6xl space-y-6">
	<!-- Header -->
	<div>
		<h1 class="flex items-center gap-3 text-2xl font-bold text-white">
			<FileText class="h-7 w-7 text-cyan-400" />
			{$_('nav.reports') || 'Reports'}
		</h1>
		<p class="mt-1 text-sm text-slate-400">Generate and download system reports.</p>
	</div>

	<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
		{#each reports as report (report.id)}
			{@const Icon = report.icon}
			<Card class="flex flex-col justify-between transition hover:bg-white/5">
				<div>
					<div class="mb-4 flex items-start justify-between">
						<div class="rounded-lg p-2 {report.bg} {report.color}">
							<Icon class="h-6 w-6" />
						</div>
						<Badge variant="secondary" class="font-mono text-xs">{report.format}</Badge>
					</div>
					<h3 class="mb-2 text-lg font-semibold text-white">{report.title}</h3>
					<p class="mb-4 text-sm text-slate-400">{report.description}</p>
				</div>
				<div class="mt-4">
					<Button
						variant="outline"
						class="group w-full gap-2 border-slate-700 bg-transparent hover:bg-white/5 hover:text-white"
						onclick={() => generateReport(report.id)}
						disabled={generating === report.id}
					>
						{#if generating === report.id}
							<div
								class="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
							></div>
							Generating...
						{:else if completed === report.id}
							<CheckCircle class="h-4 w-4 text-emerald-400" />
							Downloaded
						{:else}
							<Download class="h-4 w-4 transition-transform group-hover:translate-y-0.5" />
							Download Report
						{/if}
					</Button>
				</div>
			</Card>
		{/each}
	</div>
</div>
