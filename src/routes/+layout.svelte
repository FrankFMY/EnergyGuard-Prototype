<script lang="ts">
	import './layout.css';
	import { base } from '$app/paths';
	import Zap from 'lucide-svelte/icons/zap';
	import Activity from 'lucide-svelte/icons/activity';
	import Wrench from 'lucide-svelte/icons/wrench';

	const { children } = $props();
</script>

<div class="min-h-screen bg-slate-950 text-white selection:bg-cyan-500/30">
	<!-- Navbar -->
	<nav
		class="sticky top-0 z-50 flex items-center justify-between border-b border-white/5 bg-slate-950/80 px-6 py-4 backdrop-blur-md"
	>
		<div class="flex items-center gap-8">
			<a href="{base}/" class="flex items-center gap-2 text-xl font-bold tracking-tight">
				<div
					class="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 ring-1 ring-cyan-500/50"
				>
					<Zap class="h-5 w-5 fill-current" />
				</div>
				<span class="bg-linear-to-r from-white to-slate-400 bg-clip-text text-transparent">
					KASTOR <span class="font-normal text-slate-500">IoT</span>
				</span>
			</a>

			<div class="hidden gap-1 md:flex">
				<a
					href="{base}/"
					class="flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-slate-400 transition hover:bg-white/5 hover:text-white"
				>
					<Activity class="h-4 w-4" />
					Dashboard
				</a>
				<a
					href="{base}/maintenance"
					class="flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-slate-400 transition hover:bg-white/5 hover:text-white"
				>
					<Wrench class="h-4 w-4" />
					Maintenance
				</a>
			</div>
		</div>

		<div class="flex items-center gap-4">
			<div class="hidden text-xs text-slate-500 md:block">
				<span class="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-green-500"></span>
				System Online
			</div>
			<div class="h-8 w-8 rounded-full border border-white/10 bg-slate-800"></div>
		</div>
	</nav>

	<main class="mx-auto max-w-7xl p-6 lg:p-8">
		{@render children()}
	</main>
</div>
