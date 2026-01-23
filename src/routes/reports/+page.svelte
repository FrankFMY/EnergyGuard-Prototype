<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { Card, Button, Badge } from '$lib/components/ui/index.js';
	import { toastStore } from '$lib/state/toast.svelte.js';
	import { cn } from '$lib/utils.js';
	import FileText from 'lucide-svelte/icons/file-text';
	import Download from 'lucide-svelte/icons/download';
	import BarChart3 from 'lucide-svelte/icons/bar-chart-3';
	import Calendar from 'lucide-svelte/icons/calendar';
	import Mail from 'lucide-svelte/icons/mail';
	import Clock from 'lucide-svelte/icons/clock';
	import Eye from 'lucide-svelte/icons/eye';
	import TrendingUp from 'lucide-svelte/icons/trending-up';

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
		},
		{
			id: 'efficiency',
			title: 'Efficiency Trend Report',
			description: 'OEE metrics, performance trends, and optimization recommendations.',
			type: 'Weekly',
			format: 'PDF',
			icon: TrendingUp,
			color: 'text-purple-400',
			bg: 'bg-purple-500/10'
		}
	];

	// Recent generated reports (mock data)
	const recentReports = $state([
		{
			id: '1',
			title: 'Daily Operational Summary',
			date: new Date(Date.now() - 2 * 60 * 60 * 1000),
			format: 'PDF',
			size: '2.4 MB',
			status: 'ready'
		},
		{
			id: '2',
			title: 'Monthly Economic Analysis',
			date: new Date(Date.now() - 24 * 60 * 60 * 1000),
			format: 'PDF',
			size: '5.1 MB',
			status: 'ready'
		},
		{
			id: '3',
			title: 'Maintenance Log 2024',
			date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
			format: 'CSV',
			size: '1.2 MB',
			status: 'ready'
		},
		{
			id: '4',
			title: 'Efficiency Trend Report',
			date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
			format: 'PDF',
			size: '3.8 MB',
			status: 'ready'
		}
	]);

	let generating: string | null = $state(null);
	let sendingEmail: string | null = $state(null);

	function generateReport(reportId: string) {
		const report = reports.find((r) => r.id === reportId);
		if (!report) return;

		generating = reportId;

		// Mock generation
		setTimeout(() => {
			generating = null;
			toastStore.success('Report Downloaded', `${report.title} has been downloaded successfully.`);
		}, 2000);
	}

	function sendReportByEmail(reportId: string) {
		const report = reports.find((r) => r.id === reportId);
		if (!report) return;

		sendingEmail = reportId;

		// Mock email sending
		setTimeout(() => {
			sendingEmail = null;
			toastStore.success('Report Sent', `${report.title} has been sent to your email address.`);
		}, 1500);
	}

	function formatDate(date: Date): string {
		const now = new Date();
		const diff = now.getTime() - date.getTime();
		const hours = Math.floor(diff / (1000 * 60 * 60));
		const days = Math.floor(diff / (1000 * 60 * 60 * 24));

		if (hours < 1) return 'Just now';
		if (hours < 24) return `${hours}h ago`;
		if (days === 1) return 'Yesterday';
		if (days < 7) return `${days} days ago`;

		return date.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
		});
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

	<!-- Report Templates -->
	<div>
		<h2 class="mb-4 text-lg font-semibold text-white">Generate Report</h2>
		<div class="animate-stagger-grid grid gap-4 md:grid-cols-2 lg:grid-cols-4">
			{#each reports as report (report.id)}
				{@const Icon = report.icon}
				<Card
					class="group flex flex-col justify-between transition hover:border-white/10 hover:bg-white/5"
				>
					<div>
						<div class="mb-4 flex items-start justify-between">
							<div
								class={cn(
									'rounded-lg p-2.5 transition-transform group-hover:scale-110',
									report.bg,
									report.color
								)}
							>
								<Icon class="h-5 w-5" />
							</div>
							<Badge variant="secondary" class="font-mono text-xs">{report.format}</Badge>
						</div>
						<h3 class="mb-1.5 text-base font-semibold text-white">{report.title}</h3>
						<p class="mb-3 line-clamp-2 text-xs text-slate-400">{report.description}</p>
						<Badge variant="secondary" class="text-[10px]">{report.type}</Badge>
					</div>
					<div class="mt-4 flex gap-2">
						<Button
							variant="outline"
							size="sm"
							class="group/btn flex-1 gap-1.5 border-slate-700 bg-transparent hover:bg-white/5 hover:text-white"
							onclick={() => generateReport(report.id)}
							disabled={generating === report.id || sendingEmail === report.id}
						>
							{#if generating === report.id}
								<div
									class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
								></div>
								<span class="text-xs">Generating...</span>
							{:else}
								<Download
									class="h-3.5 w-3.5 transition-transform group-hover/btn:translate-y-0.5"
								/>
								<span class="text-xs">Download</span>
							{/if}
						</Button>
						<Button
							variant="ghost"
							size="sm"
							class="gap-1 px-2"
							onclick={() => sendReportByEmail(report.id)}
							disabled={generating === report.id || sendingEmail === report.id}
							title="Send to email"
						>
							{#if sendingEmail === report.id}
								<div
									class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
								></div>
							{:else}
								<Mail class="h-3.5 w-3.5" />
							{/if}
						</Button>
					</div>
				</Card>
			{/each}
		</div>
	</div>

	<!-- Recent Reports -->
	<div>
		<h2 class="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
			<Clock class="h-5 w-5 text-cyan-400" />
			Recent Reports
		</h2>
		<Card class="overflow-hidden p-0">
			<!-- Mobile Card View -->
			<div class="space-y-px divide-y divide-white/5 md:hidden">
				{#each recentReports as report (report.id)}
					<div class="flex items-center justify-between p-4 transition hover:bg-white/5">
						<div class="flex items-center gap-3">
							<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800">
								<FileText class="h-5 w-5 text-slate-400" />
							</div>
							<div>
								<div class="text-sm font-medium text-white">{report.title}</div>
								<div class="flex items-center gap-2 text-xs text-slate-500">
									<span>{formatDate(report.date)}</span>
									<span>•</span>
									<span>{report.size}</span>
								</div>
							</div>
						</div>
						<div class="flex gap-1">
							<Button variant="ghost" size="sm" class="h-8 w-8 p-0" title="Preview">
								<Eye class="h-4 w-4" />
							</Button>
							<Button variant="ghost" size="sm" class="h-8 w-8 p-0" title="Download">
								<Download class="h-4 w-4" />
							</Button>
						</div>
					</div>
				{/each}
			</div>

			<!-- Desktop Table View -->
			<div class="hidden md:block">
				<table class="w-full">
					<thead class="border-b border-white/5 bg-slate-900/50">
						<tr>
							<th class="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase"
								>Report</th
							>
							<th class="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase"
								>Generated</th
							>
							<th class="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase"
								>Format</th
							>
							<th class="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Size</th>
							<th class="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase"
								>Actions</th
							>
						</tr>
					</thead>
					<tbody class="divide-y divide-white/5">
						{#each recentReports as report (report.id)}
							<tr class="transition hover:bg-white/5">
								<td class="px-4 py-3">
									<div class="flex items-center gap-3">
										<div class="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800">
											<FileText class="h-4 w-4 text-slate-400" />
										</div>
										<span class="font-medium text-white">{report.title}</span>
									</div>
								</td>
								<td class="px-4 py-3 text-sm text-slate-400">{formatDate(report.date)}</td>
								<td class="px-4 py-3">
									<Badge variant="secondary" class="font-mono text-xs">{report.format}</Badge>
								</td>
								<td class="px-4 py-3 text-sm text-slate-400">{report.size}</td>
								<td class="px-4 py-3 text-right">
									<div class="flex justify-end gap-1">
										<Button variant="ghost" size="sm" class="gap-1 text-xs">
											<Eye class="h-3 w-3" />
											Preview
										</Button>
										<Button variant="ghost" size="sm" class="gap-1 text-xs">
											<Download class="h-3 w-3" />
											Download
										</Button>
										<Button variant="ghost" size="sm" class="gap-1 text-xs">
											<Mail class="h-3 w-3" />
											Email
										</Button>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</Card>
	</div>

	<!-- Scheduled Reports Info -->
	<Card class="border-cyan-500/20 bg-cyan-500/5">
		<div class="flex gap-4">
			<Calendar class="h-5 w-5 shrink-0 text-cyan-400" />
			<div class="text-sm text-slate-300">
				<p class="mb-1 font-medium">Automated Reports</p>
				<p class="text-slate-400">
					Configure automatic report generation and delivery. Daily reports are sent at 06:00,
					weekly reports on Monday, and monthly reports on the 1st of each month.
				</p>
			</div>
		</div>
	</Card>
</div>
