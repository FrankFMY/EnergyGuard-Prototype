<script lang="ts">
	import { currency, SUPPORTED_CURRENCIES, type CurrencyCode } from '$lib/state/currency.svelte.js';
	import Coins from 'lucide-svelte/icons/coins';
	import { _ as t } from 'svelte-i18n';

	let open = $state(false);

	function handleSelect(code: string) {
		currency.current = code as CurrencyCode;
		open = false;
	}

	function toggleDropdown() {
		open = !open;
	}
</script>

<div class="relative">
	<button
		onclick={toggleDropdown}
		class="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"
		title={$t('common.currency')}
	>
		<Coins class="h-4 w-4" />
		<span class="uppercase">{currency.current}</span>
	</button>

	{#if open}
		<div
			class="absolute top-full right-0 z-50 mt-1 w-44 overflow-hidden rounded-lg border border-white/10 bg-slate-900 shadow-xl"
		>
			{#each Object.values(SUPPORTED_CURRENCIES) as c (c.code)}
				<button
					onclick={() => handleSelect(c.code)}
					class="flex w-full items-center justify-between px-3 py-2 text-left text-sm transition hover:bg-white/5"
					class:text-cyan-400={currency.current === c.code}
					class:text-slate-300={currency.current !== c.code}
				>
					<div class="flex items-center gap-2">
						<span class="w-4 font-mono text-xs text-slate-500">{c.symbol}</span>
						<span>{$t(`currencies.${c.code}`)}</span>
					</div>
					<span class="text-[10px] font-medium text-slate-500 uppercase">{c.code}</span>
				</button>
			{/each}
		</div>
	{/if}
</div>

<!-- Close dropdown when clicking outside -->
{#if open}
	<button class="fixed inset-0 z-40" onclick={() => (open = false)} aria-label="Close menu"
	></button>
{/if}
