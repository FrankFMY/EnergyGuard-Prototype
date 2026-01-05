<script lang="ts">
	import { base } from '$app/paths';
	import { page } from '$app/stores';
	import { _ } from 'svelte-i18n';
	import { cn } from '$lib/utils.js';
	import Menu from 'lucide-svelte/icons/menu';
	import X from 'lucide-svelte/icons/x';
	import Activity from 'lucide-svelte/icons/activity';
	import Wrench from 'lucide-svelte/icons/wrench';
	import BarChart3 from 'lucide-svelte/icons/bar-chart-3';
	import Bell from 'lucide-svelte/icons/bell';
	import Shield from 'lucide-svelte/icons/shield';
	import Cable from 'lucide-svelte/icons/cable';
	import Settings from 'lucide-svelte/icons/settings';
	import Zap from 'lucide-svelte/icons/zap';
	import LanguageSwitcher from './LanguageSwitcher.svelte';

	let open = $state(false);

	const navItems = [
		{ href: `${base}/`, label: 'nav.dashboard', icon: Activity },
		{ href: `${base}/maintenance`, label: 'nav.maintenance', icon: Wrench },
		{ href: `${base}/analytics`, label: 'nav.analytics', icon: BarChart3 },
		{ href: `${base}/alerts`, label: 'nav.alerts', icon: Bell },
		{ href: `${base}/integrations`, label: 'nav.integrations', icon: Cable },
		{ href: `${base}/admin`, label: 'nav.admin', icon: Shield },
		{ href: `${base}/settings`, label: 'nav.settings', icon: Settings }
	];

	function isActive(href: string) {
		const currentPath = $page.url.pathname;
		if (href === `${base}/`) {
			return currentPath === `${base}/` || currentPath === base;
		}
		return currentPath.startsWith(href);
	}

	function close() {
		open = false;
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			close();
		}
	}
</script>

<!-- Mobile Menu Button -->
<button
	onclick={() => (open = !open)}
	class="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-slate-400 transition-all duration-200 hover:bg-cyan-500/10 hover:text-cyan-400 active:scale-95 lg:hidden"
	aria-label="Toggle menu"
>
	{#if open}
		<X class="h-5 w-5" />
	{:else}
		<Menu class="h-5 w-5" />
	{/if}
</button>

<!-- Mobile Menu Overlay -->
{#if open}
	<button
		class="animate-fade-in fixed inset-0 z-40 bg-slate-950/90 backdrop-blur-md lg:hidden"
		style="animation-duration: 200ms;"
		onclick={close}
		onkeydown={handleKeyDown}
		aria-label="Close menu"
	></button>

	<!-- Mobile Menu Panel -->
	<nav
		class="animate-slide-in-right fixed top-0 left-0 z-50 flex h-full w-72 flex-col border-r border-white/5 bg-slate-950 lg:hidden"
		style="animation-duration: 250ms;"
	>
		<!-- Header -->
		<div class="flex items-center justify-between border-b border-white/5 p-4">
			<a href="{base}/" onclick={close} class="flex items-center gap-2">
				<div
					class="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-cyan-500/20 to-cyan-500/5 text-cyan-400 ring-1 ring-cyan-500/30"
				>
					<Zap class="h-5 w-5 fill-current" />
				</div>
				<span class="text-lg font-bold text-white">KASTOR</span>
			</a>
			<button
				onclick={close}
				class="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-all hover:bg-white/5 hover:text-white active:scale-95"
			>
				<X class="h-5 w-5" />
			</button>
		</div>

		<!-- Navigation -->
		<div class="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
			{#each navItems as item, i (item.href)}
				{@const Icon = item.icon}
				{@const active = isActive(item.href)}
				<a
					href={item.href}
					onclick={close}
					class={cn(
						'animate-fade-in flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium opacity-0 transition-all duration-200',
						active
							? 'bg-cyan-500/10 text-cyan-400'
							: 'text-slate-400 hover:bg-white/5 hover:text-white active:scale-[0.98]'
					)}
					style="animation-delay: {i * 40}ms; animation-fill-mode: forwards;"
				>
					<Icon class={cn('h-5 w-5 transition-transform', active && 'scale-110')} />
					<span>{$_(item.label)}</span>
					{#if active}
						<span class="ml-auto h-2 w-2 rounded-full bg-cyan-400"></span>
					{/if}
				</a>
			{/each}
		</div>

		<!-- Footer -->
		<div class="border-t border-white/5 p-4">
			<div class="flex items-center justify-between">
				<span class="text-xs text-slate-500">Язык</span>
				<LanguageSwitcher />
			</div>
			<div
				class="mt-3 flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-400"
			>
				<span class="relative flex h-2 w-2">
					<span
						class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"
					></span>
					<span class="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
				</span>
				Система онлайн
			</div>
		</div>
	</nav>
{/if}
