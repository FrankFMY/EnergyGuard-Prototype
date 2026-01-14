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
	import CurrencySwitcher from './CurrencySwitcher.svelte';

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

	// Prevent body scroll when menu is open
	$effect(() => {
		if (typeof document !== 'undefined') {
			if (open) {
				document.body.style.overflow = 'hidden';
			} else {
				document.body.style.overflow = '';
			}
		}
	});
</script>

<!-- Mobile Menu Button - 44px minimum touch target -->
<button
	onclick={() => (open = !open)}
	class="flex h-11 w-11 items-center justify-center rounded-xl bg-white/5 text-slate-400 transition-all duration-200 hover:bg-cyan-500/10 hover:text-cyan-400 active:scale-95 lg:hidden"
	aria-label={open ? $_('nav.closeMenu') : $_('nav.openMenu')}
	aria-expanded={open}
>
	{#if open}
		<X class="h-5 w-5" />
	{:else}
		<Menu class="h-5 w-5" />
	{/if}
</button>

<!-- Mobile Menu Overlay -->
{#if open}
	<div
		class="animate-fade-in fixed inset-0 z-[9998] bg-slate-950/90 backdrop-blur-md lg:hidden"
		style="animation-duration: 200ms;"
		role="button"
		tabindex="-1"
		onclick={close}
		onkeydown={handleKeyDown}
		aria-label={$_('nav.closeMenu')}
	></div>

	<!-- Mobile Menu Panel -->
	<nav
		class="animate-slide-in-left fixed inset-y-0 left-0 z-[9999] flex w-[min(18rem,85vw)] flex-col border-r border-white/10 bg-slate-950 shadow-2xl shadow-black/50 lg:hidden"
		style="height: 100dvh; padding-top: env(safe-area-inset-top); padding-bottom: env(safe-area-inset-bottom); padding-left: env(safe-area-inset-left);"
		aria-label={$_('nav.mainNavigation')}
	>
		<!-- Header -->
		<div class="flex items-center justify-between border-b border-white/10 px-4 py-4">
			<a href="{base}/" onclick={close} class="flex min-h-[44px] items-center gap-2.5">
				<div
					class="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-cyan-500/20 to-cyan-500/5 text-cyan-400 ring-1 ring-cyan-500/30"
				>
					<Zap class="h-5 w-5 fill-current" />
				</div>
				<span class="text-lg font-bold text-white">KASTOR</span>
			</a>
			<button
				onclick={close}
				class="flex h-11 w-11 items-center justify-center rounded-xl text-slate-400 transition-all hover:bg-white/5 hover:text-white active:scale-95"
				aria-label={$_('nav.closeMenu')}
			>
				<X class="h-5 w-5" />
			</button>
		</div>

		<!-- Navigation -->
		<div class="flex flex-1 flex-col gap-1.5 overflow-y-auto overscroll-contain p-4">
			{#each navItems as item, i (item.href)}
				{@const Icon = item.icon}
				{@const active = isActive(item.href)}
				<a
					href={item.href}
					onclick={close}
					class={cn(
						'animate-fade-in flex min-h-[48px] items-center gap-3.5 rounded-xl px-4 py-3 text-base font-medium opacity-0 transition-all duration-200',
						active
							? 'bg-cyan-500/15 text-cyan-400 ring-1 ring-cyan-500/20'
							: 'text-slate-300 hover:bg-white/5 hover:text-white active:scale-[0.98] active:bg-white/10'
					)}
					style="animation-delay: {i * 40}ms; animation-fill-mode: forwards;"
					aria-current={active ? 'page' : undefined}
				>
					<Icon class={cn('h-5 w-5 shrink-0 transition-transform', active && 'scale-110')} />
					<span class="flex-1">{$_(item.label)}</span>
					{#if active}
						<span class="h-2 w-2 shrink-0 rounded-full bg-cyan-400 shadow-lg shadow-cyan-400/50"
						></span>
					{/if}
				</a>
			{/each}
		</div>

		<!-- Footer -->
		<div class="border-t border-white/10 p-4">
			<!-- Switchers in a more mobile-friendly layout -->
			<div class="mb-4 grid grid-cols-2 gap-3">
				<div class="flex flex-col gap-1.5 rounded-lg bg-white/5 p-3">
					<span class="text-xs font-medium text-slate-500">{$_('settings.language')}</span>
					<LanguageSwitcher />
				</div>
				<div class="flex flex-col gap-1.5 rounded-lg bg-white/5 p-3">
					<span class="text-xs font-medium text-slate-500">{$_('common.currency')}</span>
					<CurrencySwitcher />
				</div>
			</div>

			<!-- System Status -->
			<div
				class="flex items-center gap-2.5 rounded-xl bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-400"
			>
				<span class="relative flex h-2.5 w-2.5 shrink-0">
					<span
						class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"
					></span>
					<span class="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
				</span>
				{$_('app.systemOnline')}
			</div>
		</div>
	</nav>
{/if}
