<script lang="ts">
	import { base } from '$app/paths';
	import { _ } from 'svelte-i18n';
	import Menu from 'lucide-svelte/icons/menu';
	import X from 'lucide-svelte/icons/x';
	import Activity from 'lucide-svelte/icons/activity';
	import Wrench from 'lucide-svelte/icons/wrench';
	import BarChart3 from 'lucide-svelte/icons/bar-chart-3';
	import Bell from 'lucide-svelte/icons/bell';
	import Shield from 'lucide-svelte/icons/shield';
	import Cable from 'lucide-svelte/icons/cable';
	import Settings from 'lucide-svelte/icons/settings';
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
	class="rounded-lg p-2 text-slate-400 transition hover:bg-white/5 hover:text-white md:hidden"
	aria-label="Toggle menu"
>
	{#if open}
		<X class="h-6 w-6" />
	{:else}
		<Menu class="h-6 w-6" />
	{/if}
</button>

<!-- Mobile Menu Overlay -->
{#if open}
	<button
		class="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm md:hidden"
		onclick={close}
		onkeydown={handleKeyDown}
		aria-label="Close menu"
	></button>

	<!-- Mobile Menu Panel -->
	<nav
		class="fixed top-0 left-0 z-50 flex h-full w-64 flex-col border-r border-white/5 bg-slate-950 p-6 md:hidden"
	>
		<div class="mb-8 flex items-center justify-between">
			<span class="text-lg font-bold text-white">KASTOR IoT</span>
			<button onclick={close} class="rounded-lg p-2 text-slate-400 hover:text-white">
				<X class="h-5 w-5" />
			</button>
		</div>

		<div class="flex flex-1 flex-col gap-2">
			{#each navItems as item (item.href)}
				{@const Icon = item.icon}
				<a
					href={item.href}
					onclick={close}
					class="flex items-center gap-3 rounded-lg px-4 py-3 text-slate-400 transition hover:bg-white/5 hover:text-white"
				>
					<Icon class="h-5 w-5" />
					<span>{$_(item.label)}</span>
				</a>
			{/each}
		</div>

		<div class="border-t border-white/5 pt-4">
			<div class="flex items-center justify-between">
				<span class="text-xs text-slate-500">Language</span>
				<LanguageSwitcher />
			</div>
		</div>
	</nav>
{/if}
