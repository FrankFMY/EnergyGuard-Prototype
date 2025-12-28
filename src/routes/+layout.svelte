<script lang="ts">
	import './layout.css';
	import { base } from '$app/paths';

	const { children } = $props();
</script>

<div class="min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-900 dark:text-white">
	<nav
		class="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-800"
	>
		<div class="flex items-center gap-6">
			<a
				href="{base}/"
				class="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-xl font-bold text-transparent"
				>KASTOR IoT</a
			>
			<div class="flex gap-4 text-sm font-medium text-slate-600 dark:text-slate-300">
				<a href="{base}/" class="transition hover:text-blue-600">Dashboard</a>
				<a href="{base}/maintenance" class="transition hover:text-blue-600">Maintenance</a>
			</div>
		</div>
		<div class="text-xs text-slate-400">MVP Simulation</div>
	</nav>
	<main class="p-6">
		{@render children()}
	</main>
</div>
