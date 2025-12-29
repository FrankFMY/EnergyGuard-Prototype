<script lang="ts">
	import './layout.css';
	import '$lib/i18n/index.js';
	import { base } from '$app/paths';
	import { _, isLoading } from 'svelte-i18n';
	import { onMount } from 'svelte';
	import Zap from 'lucide-svelte/icons/zap';
	import Activity from 'lucide-svelte/icons/activity';
	import Wrench from 'lucide-svelte/icons/wrench';
	import BarChart3 from 'lucide-svelte/icons/bar-chart-3';
	import Bell from 'lucide-svelte/icons/bell';
	import Settings from 'lucide-svelte/icons/settings';
	import Shield from 'lucide-svelte/icons/shield';
	import LanguageSwitcher from '$lib/components/LanguageSwitcher.svelte';
	import MobileNav from '$lib/components/MobileNav.svelte';
	import CommandPalette from '$lib/components/CommandPalette.svelte';
	import { SkipLink } from '$lib/components/ui/index.js';

	const { children } = $props();

	const navItems = [
		{ href: `${base}/`, label: 'nav.dashboard', icon: Activity },
		{ href: `${base}/maintenance`, label: 'nav.maintenance', icon: Wrench },
		{ href: `${base}/analytics`, label: 'nav.analytics', icon: BarChart3 },
		{ href: `${base}/alerts`, label: 'nav.alerts', icon: Bell },
		{ href: `${base}/admin`, label: 'nav.admin', icon: Shield }
	];

	// Register service worker for PWA
	onMount(() => {
		if ('serviceWorker' in navigator) {
			navigator.serviceWorker.register('/sw.js').catch((err) => {
				console.warn('Service worker registration failed:', err);
			});
		}
	});
</script>

{#if $isLoading}
	<div
		class="flex h-screen items-center justify-center bg-slate-950"
		aria-busy="true"
		aria-live="polite"
	>
		<div
			class="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent"
			role="status"
			aria-label="Loading"
		></div>
	</div>
{:else}
	<div class="min-h-screen bg-slate-950 text-white selection:bg-cyan-500/30">
		<!-- Skip Link for keyboard users -->
		<SkipLink />

		<!-- Navbar -->
		<nav
			class="sticky top-0 z-50 flex items-center justify-between border-b border-white/5 bg-slate-950/80 px-4 py-4 backdrop-blur-md md:px-6"
			aria-label="Main navigation"
		>
			<div class="flex items-center gap-4 md:gap-8">
				<!-- Mobile Menu -->
				<MobileNav />

				<!-- Logo -->
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

				<!-- Desktop Navigation -->
				<div class="hidden gap-1 md:flex">
					{#each navItems as item (item.href)}
						{@const Icon = item.icon}
						<a
							href={item.href}
							class="flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-slate-400 transition hover:bg-white/5 hover:text-white"
						>
							<Icon class="h-4 w-4" />
							{$_(item.label)}
						</a>
					{/each}
				</div>
			</div>

			<div class="flex items-center gap-4">
				<!-- System Status -->
				<div class="hidden items-center gap-2 text-xs text-slate-500 md:flex">
					<span class="inline-block h-2 w-2 animate-pulse rounded-full bg-green-500"></span>
					{$_('app.systemOnline')}
				</div>

				<!-- Language Switcher -->
				<div class="hidden md:block">
					<LanguageSwitcher />
				</div>

				<!-- Settings -->
				<a
					href="{base}/settings"
					class="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white"
					aria-label="Settings"
				>
					<Settings class="h-5 w-5" />
				</a>

				<!-- User Avatar -->
				<div class="h-8 w-8 rounded-full border border-white/10 bg-slate-800"></div>
			</div>
		</nav>

		<main id="main-content" class="mx-auto max-w-7xl p-4 md:p-6 lg:p-8" tabindex="-1">
			{@render children()}
		</main>

		<CommandPalette />
	</div>
{/if}
