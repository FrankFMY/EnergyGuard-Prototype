<script lang="ts">
	import './layout.css';
	import '$lib/i18n/index.js';
	import { base } from '$app/paths';
	import { page, navigating } from '$app/stores';
	import { _, isLoading, locale } from 'svelte-i18n';
	import { onMount } from 'svelte';
	import Zap from 'lucide-svelte/icons/zap';
	import Activity from 'lucide-svelte/icons/activity';
	import Wrench from 'lucide-svelte/icons/wrench';
	import BarChart3 from 'lucide-svelte/icons/bar-chart-3';
	import Bell from 'lucide-svelte/icons/bell';
	import Settings from 'lucide-svelte/icons/settings';
	import Shield from 'lucide-svelte/icons/shield';
	import ClipboardList from 'lucide-svelte/icons/clipboard-list';
	import DollarSign from 'lucide-svelte/icons/dollar-sign';
	import FileText from 'lucide-svelte/icons/file-text';
	import ChevronDown from 'lucide-svelte/icons/chevron-down';
	import Calendar from 'lucide-svelte/icons/calendar';
	import GitCompare from 'lucide-svelte/icons/git-compare';
	import Cable from 'lucide-svelte/icons/cable';
	import LayoutGrid from 'lucide-svelte/icons/layout-grid';
	import LanguageSwitcher from '$lib/components/LanguageSwitcher.svelte';
	import CurrencySwitcher from '$lib/components/CurrencySwitcher.svelte';
	import MobileNav from '$lib/components/MobileNav.svelte';
	import CommandPalette from '$lib/components/CommandPalette.svelte';
	import ToastContainer from '$lib/components/ToastContainer.svelte';
	import ConnectionStatus from '$lib/components/ConnectionStatus.svelte';
	import { SkipLink } from '$lib/components/ui/index.js';
	import { cn } from '$lib/utils.js';

	const { children } = $props();

	// Primary nav items (always visible)
	const primaryNavItems = [
		{ href: `${base}/`, label: 'nav.dashboard', icon: Activity },
		{ href: `${base}/alerts`, label: 'nav.alerts', icon: Bell }
	];

	// Grouped nav items with dropdowns
	const navGroups = [
		{
			id: 'operations',
			label: 'nav.operations',
			icon: Wrench,
			items: [
				{ href: `${base}/maintenance`, label: 'nav.maintenance', icon: Wrench },
				{ href: `${base}/work-orders`, label: 'nav.workOrders', icon: ClipboardList },
				{ href: `${base}/calendar`, label: 'nav.calendar', icon: Calendar }
			]
		},
		{
			id: 'analytics',
			label: 'nav.analyticsGroup',
			icon: BarChart3,
			items: [
				{ href: `${base}/analytics`, label: 'nav.analytics', icon: BarChart3 },
				{ href: `${base}/dashboards`, label: 'nav.dashboards', icon: LayoutGrid },
				{ href: `${base}/comparison`, label: 'nav.comparison', icon: GitCompare },
				{ href: `${base}/economics`, label: 'nav.economics', icon: DollarSign },
				{ href: `${base}/reports`, label: 'nav.reports', icon: FileText }
			]
		},
		{
			id: 'system',
			label: 'nav.system',
			icon: Shield,
			items: [
				{ href: `${base}/admin`, label: 'nav.admin', icon: Shield },
				{ href: `${base}/integrations`, label: 'nav.integrations', icon: Cable }
			]
		}
	];

	// Secondary nav items (none needed now, all in groups)
	const secondaryNavItems: { href: string; label: string; icon: typeof Shield }[] = [];

	let mounted = $state(false);
	let openDropdown = $state<string | null>(null);

	// Determine active route
	function isActive(href: string) {
		const currentPath = $page.url.pathname;
		if (href === `${base}/`) {
			return currentPath === `${base}/` || currentPath === base;
		}
		return currentPath.startsWith(href);
	}

	// Check if any item in group is active
	function isGroupActive(items: { href: string }[]) {
		return items.some((item) => isActive(item.href));
	}

	function toggleDropdown(id: string) {
		openDropdown = openDropdown === id ? null : id;
	}

	function closeDropdowns() {
		openDropdown = null;
	}

	// Close dropdown when clicking outside
	function handleClickOutside(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (!target.closest('.nav-dropdown')) {
			closeDropdowns();
		}
	}

	// Register service worker for PWA
	onMount(() => {
		mounted = true;
		if ('serviceWorker' in navigator) {
			navigator.serviceWorker.register('/sw.js').catch((err) => {
				console.warn('Service worker registration failed:', err);
			});
		}

		document.addEventListener('click', handleClickOutside);
		return () => {
			document.removeEventListener('click', handleClickOutside);
		};
	});
</script>

{#if $isLoading || !$locale}
	<div
		class="flex h-screen items-center justify-center bg-slate-950"
		aria-busy="true"
		aria-live="polite"
	>
		<div class="flex flex-col items-center gap-4">
			<div class="relative">
				<div
					class="h-12 w-12 animate-spin rounded-full border-2 border-cyan-500/20 border-t-cyan-500"
				></div>
				<Zap
					class="absolute top-1/2 left-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 text-cyan-400"
				/>
			</div>
			<span class="text-sm text-slate-400">{$locale ? $_('app.loading') : 'Loading...'}</span>
		</div>
	</div>
{:else}
	<!-- Navigation Loading Indicator -->
	{#if $navigating}
		<!-- Top progress bar -->
		<div class="fixed top-0 left-0 right-0 z-[100] h-1 overflow-hidden bg-slate-800/50">
			<div class="h-full w-1/3 animate-[shimmer_1s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-cyan-500 to-transparent"></div>
		</div>
		<!-- Subtle overlay to indicate loading -->
		<div class="fixed inset-0 z-[99] bg-slate-950/30 backdrop-blur-[1px] transition-opacity duration-200"></div>
	{/if}
	<div
		class={cn(
			'min-h-screen bg-slate-950 text-white selection:bg-cyan-500/30',
			mounted && 'animate-fade-in'
		)}
	>
		<!-- Skip Link for keyboard users -->
		<SkipLink />

		<!-- Navbar -->
		<nav
			class="sticky top-0 z-50 border-b border-white/5 bg-slate-950/90 backdrop-blur-xl"
			aria-label="Main navigation"
		>
			<div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-6">
				<div class="flex items-center gap-3 lg:gap-4">
					<!-- Mobile Menu -->
					<MobileNav />

					<!-- Logo -->
					<a
						href="{base}/"
						data-sveltekit-preload-data="hover"
						class="group flex shrink-0 items-center gap-2.5 text-xl font-bold tracking-tight"
					>
						<div
							class="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-cyan-500/20 to-cyan-500/5 text-cyan-400 ring-1 ring-cyan-500/30 transition-all duration-300 group-hover:shadow-lg group-hover:shadow-cyan-500/20 group-hover:ring-cyan-400/60"
						>
							<Zap
								class="h-5 w-5 fill-current transition-transform duration-300 group-hover:scale-110"
							/>
						</div>
						<span
							class="hidden bg-linear-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent sm:inline"
						>
							EnergyGuard
						</span>
					</a>

					<!-- Desktop Navigation -->
					<div class="hidden items-center gap-1 lg:flex">
						<!-- Primary Items -->
						{#each primaryNavItems as item (item.href)}
							{@const Icon = item.icon}
							{@const active = isActive(item.href)}
							<a
								href={item.href}
								data-sveltekit-preload-data="hover"
								class={cn(
									'relative flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
									active
										? 'bg-cyan-500/10 text-cyan-400'
										: 'text-slate-400 hover:bg-white/5 hover:text-white'
								)}
							>
								<Icon class={cn('h-4 w-4 shrink-0', active && 'scale-110')} />
								<span class="whitespace-nowrap">{$_(item.label)}</span>
								{#if active}
									<span
										class="absolute bottom-0 left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full bg-cyan-400"
									></span>
								{/if}
							</a>
						{/each}

						<!-- Dropdown Groups -->
						{#each navGroups as group (group.id)}
							{@const GroupIcon = group.icon}
							{@const groupActive = isGroupActive(group.items)}
							<div class="nav-dropdown relative">
								<button
									type="button"
									onclick={() => toggleDropdown(group.id)}
									class={cn(
										'flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
										groupActive
											? 'bg-cyan-500/10 text-cyan-400'
											: 'text-slate-400 hover:bg-white/5 hover:text-white'
									)}
								>
									<GroupIcon class={cn('h-4 w-4 shrink-0', groupActive && 'scale-110')} />
									<span class="whitespace-nowrap">{$_(group.label)}</span>
									<ChevronDown
										class={cn(
											'h-3.5 w-3.5 transition-transform duration-200',
											openDropdown === group.id && 'rotate-180'
										)}
									/>
								</button>

								{#if openDropdown === group.id}
									<div
										class="animate-fade-in absolute top-full left-0 z-50 mt-1 min-w-[180px] rounded-lg border border-white/10 bg-slate-900/95 p-1 shadow-xl backdrop-blur-xl"
									>
										{#each group.items as item (item.href)}
											{@const Icon = item.icon}
											{@const active = isActive(item.href)}
											<a
												href={item.href}
												onclick={closeDropdowns}
												data-sveltekit-preload-data="hover"
												class={cn(
													'flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm font-medium transition-all',
													active
														? 'bg-cyan-500/15 text-cyan-400'
														: 'text-slate-300 hover:bg-white/5 hover:text-white'
												)}
											>
												<Icon class="h-4 w-4 shrink-0" />
												<span>{$_(item.label)}</span>
											</a>
										{/each}
									</div>
								{/if}
							</div>
						{/each}

						<!-- Secondary Items (Admin) -->
						{#each secondaryNavItems as item (item.href)}
							{@const Icon = item.icon}
							{@const active = isActive(item.href)}
							<a
								href={item.href}
								class={cn(
									'relative flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
									active
										? 'bg-cyan-500/10 text-cyan-400'
										: 'text-slate-400 hover:bg-white/5 hover:text-white'
								)}
							>
								<Icon class={cn('h-4 w-4 shrink-0', active && 'scale-110')} />
								<span class="whitespace-nowrap">{$_(item.label)}</span>
								{#if active}
									<span
										class="absolute bottom-0 left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full bg-cyan-400"
									></span>
								{/if}
							</a>
						{/each}
					</div>
				</div>

				<div class="flex shrink-0 items-center gap-2 md:gap-3">
					<!-- System Status -->
					<div
						class="hidden items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-1.5 text-[10px] leading-none font-medium whitespace-nowrap text-emerald-400 lg:flex lg:px-3 lg:text-[11px]"
					>
						<span class="relative flex h-1.5 w-1.5 shrink-0">
							<span
								class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"
							></span>
							<span class="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
						</span>
						<span class="hidden xl:inline">{$_('app.systemOnline')}</span>
						<span class="xl:hidden">OK</span>
					</div>

					<!-- Language Switcher -->
					<div class="hidden md:flex md:items-center md:gap-1">
						<LanguageSwitcher />
						<CurrencySwitcher />
					</div>

					<!-- Settings -->
					<a
						href="{base}/settings"
						class="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-all duration-200 hover:rotate-45 hover:bg-white/10 hover:text-white"
						aria-label="Settings"
					>
						<Settings class="h-5 w-5" />
					</a>

					<!-- User Avatar -->
					<div
						class="relative h-9 w-9 cursor-pointer overflow-hidden rounded-full border border-white/10 bg-linear-to-br from-cyan-500/20 to-violet-500/20 transition-all duration-200 hover:scale-105 hover:border-white/30"
					>
						<div class="absolute inset-0.5 rounded-full bg-slate-800"></div>
					</div>
				</div>
			</div>
		</nav>

		<main
			id="main-content"
			class="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8 lg:px-8"
			tabindex="-1"
		>
			{@render children()}
		</main>

		<CommandPalette />
		<ToastContainer />
		<ConnectionStatus />
	</div>
{/if}
