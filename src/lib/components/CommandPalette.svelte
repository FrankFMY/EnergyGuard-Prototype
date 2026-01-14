<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { cn } from '$lib/utils.js';
	import Search from 'lucide-svelte/icons/search';
	import Activity from 'lucide-svelte/icons/activity';
	import Wrench from 'lucide-svelte/icons/wrench';
	import TrendingUp from 'lucide-svelte/icons/trending-up';
	import Bell from 'lucide-svelte/icons/bell';
	import FileText from 'lucide-svelte/icons/file-text';
	import Settings from 'lucide-svelte/icons/settings';
	import CalendarIcon from 'lucide-svelte/icons/calendar';
	import ClipboardList from 'lucide-svelte/icons/clipboard-list';
	import Cpu from 'lucide-svelte/icons/cpu';
	import BarChart from 'lucide-svelte/icons/bar-chart-3';
	import Command from 'lucide-svelte/icons/command';

	let open = $state(false);
	let query = $state('');
	let selectedIndex = $state(0);
	let inputRef = $state<HTMLInputElement | null>(null);

	const commands = [
		{
			id: 'dashboard',
			label: 'Dashboard',
			icon: Activity,
			href: `${base}/`,
			keywords: ['home', 'main']
		},
		{
			id: 'maintenance',
			label: 'Maintenance',
			icon: Wrench,
			href: `${base}/maintenance`,
			keywords: ['service', 'repair']
		},
		{
			id: 'economics',
			label: 'Economics',
			icon: TrendingUp,
			href: `${base}/economics`,
			keywords: ['cost', 'money', 'finance']
		},
		{
			id: 'alerts',
			label: 'Alerts',
			icon: Bell,
			href: `${base}/alerts`,
			keywords: ['notifications', 'warnings']
		},
		{
			id: 'reports',
			label: 'Reports',
			icon: FileText,
			href: `${base}/reports`,
			keywords: ['pdf', 'export', 'download']
		},
		{
			id: 'settings',
			label: 'Settings',
			icon: Settings,
			href: `${base}/settings`,
			keywords: ['config', 'preferences']
		},
		{
			id: 'calendar',
			label: 'Calendar',
			icon: CalendarIcon,
			href: `${base}/calendar`,
			keywords: ['schedule', 'events']
		},
		{
			id: 'work-orders',
			label: 'Work Orders',
			icon: ClipboardList,
			href: `${base}/work-orders`,
			keywords: ['tasks', 'jobs']
		},
		{
			id: 'comparison',
			label: 'Engine Comparison',
			icon: BarChart,
			href: `${base}/comparison`,
			keywords: ['compare', 'benchmark']
		},
		{
			id: 'gpu-1',
			label: 'Engine GPU-1',
			icon: Cpu,
			href: `${base}/engine/gpu-1`,
			keywords: ['engine']
		},
		{
			id: 'gpu-2',
			label: 'Engine GPU-2',
			icon: Cpu,
			href: `${base}/engine/gpu-2`,
			keywords: ['engine']
		},
		{
			id: 'gpu-3',
			label: 'Engine GPU-3',
			icon: Cpu,
			href: `${base}/engine/gpu-3`,
			keywords: ['engine']
		},
		{
			id: 'gpu-4',
			label: 'Engine GPU-4',
			icon: Cpu,
			href: `${base}/engine/gpu-4`,
			keywords: ['engine']
		},
		{
			id: 'gpu-5',
			label: 'Engine GPU-5',
			icon: Cpu,
			href: `${base}/engine/gpu-5`,
			keywords: ['engine']
		},
		{
			id: 'gpu-6',
			label: 'Engine GPU-6',
			icon: Cpu,
			href: `${base}/engine/gpu-6`,
			keywords: ['engine']
		}
	];

	const filteredCommands = $derived.by(() => {
		if (!query) return commands;
		const lowerQuery = query.toLowerCase();
		return commands.filter(
			(cmd) =>
				cmd.label.toLowerCase().includes(lowerQuery) ||
				cmd.keywords.some((kw) => kw.includes(lowerQuery))
		);
	});

	function handleKeydown(e: KeyboardEvent) {
		// Open with Cmd+K or Ctrl+K
		if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
			e.preventDefault();
			open = !open;
			if (open) {
				query = '';
				selectedIndex = 0;
				setTimeout(() => inputRef?.focus(), 0);
			}
		}

		if (!open) return;

		// Close with Escape
		if (e.key === 'Escape') {
			e.preventDefault();
			open = false;
		}

		// Navigate with arrows
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			selectedIndex = Math.min(selectedIndex + 1, filteredCommands.length - 1);
		}
		if (e.key === 'ArrowUp') {
			e.preventDefault();
			selectedIndex = Math.max(selectedIndex - 1, 0);
		}

		// Select with Enter
		if (e.key === 'Enter' && filteredCommands[selectedIndex]) {
			e.preventDefault();
			selectCommand(filteredCommands[selectedIndex]);
		}
	}

	function selectCommand(cmd: (typeof commands)[0]) {
		open = false;
		query = '';
		goto(cmd.href);
	}

	function handleBackdropClick() {
		open = false;
	}

	onMount(() => {
		window.addEventListener('keydown', handleKeydown);
	});

	onDestroy(() => {
		if (typeof window !== 'undefined') {
			window.removeEventListener('keydown', handleKeydown);
		}
	});

	// Reset selection when query changes
	$effect(() => {
		if (query !== undefined) {
			selectedIndex = 0;
		}
	});
</script>

{#if open}
	<!-- Backdrop -->
	<div
		class="fixed inset-0 z-100 bg-black/60 backdrop-blur-sm"
		onclick={handleBackdropClick}
		role="button"
		tabindex="-1"
		onkeydown={(e) => e.key === 'Escape' && handleBackdropClick()}
	></div>

	<!-- Command Palette -->
	<div class="fixed inset-x-4 top-[20%] z-101 mx-auto max-w-xl">
		<div class="overflow-hidden rounded-xl border border-white/10 bg-slate-900 shadow-2xl">
			<!-- Search Input -->
			<div class="flex items-center gap-3 border-b border-white/5 px-4">
				<Search class="h-5 w-5 text-slate-500" />
				<input
					bind:this={inputRef}
					bind:value={query}
					type="text"
					placeholder="Search pages, engines, actions..."
					class="flex-1 bg-transparent py-4 text-white placeholder-slate-500 outline-none"
				/>
				<kbd
					class="rounded border border-slate-700 bg-slate-800 px-2 py-0.5 text-xs text-slate-400"
				>
					ESC
				</kbd>
			</div>

			<!-- Results -->
			<div class="max-h-80 overflow-y-auto p-2">
				{#if filteredCommands.length === 0}
					<div class="py-8 text-center text-sm text-slate-500">No results found</div>
				{:else}
					{#each filteredCommands as cmd, i (cmd.id)}
						{@const Icon = cmd.icon}
						<button
							type="button"
							class={cn(
								'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition',
								i === selectedIndex
									? 'bg-cyan-500/20 text-white'
									: 'text-slate-400 hover:bg-white/5'
							)}
							onclick={() => selectCommand(cmd)}
							onmouseenter={() => (selectedIndex = i)}
						>
							<Icon class="h-4 w-4" />
							<span class="flex-1">{cmd.label}</span>
							{#if i === selectedIndex}
								<kbd
									class="rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 text-xs text-slate-400"
								>
									↵
								</kbd>
							{/if}
						</button>
					{/each}
				{/if}
			</div>

			<!-- Footer -->
			<div
				class="flex items-center justify-between border-t border-white/5 px-4 py-2 text-xs text-slate-500"
			>
				<div class="flex items-center gap-2">
					<Command class="h-3 w-3" />
					<span>K to toggle</span>
				</div>
				<div class="flex items-center gap-4">
					<span>↑↓ to navigate</span>
					<span>↵ to select</span>
				</div>
			</div>
		</div>
	</div>
{/if}
