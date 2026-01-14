<script lang="ts">
	import { locale, setLocale } from '$lib/i18n/index.js';
	import Languages from 'lucide-svelte/icons/languages';

	const languages = [
		{ code: 'ru', label: 'RU', name: 'Русский' },
		{ code: 'en', label: 'EN', name: 'English' }
	];

	let open = $state(false);

	function handleSelect(code: string) {
		setLocale(code);
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
	>
		<Languages class="h-4 w-4" />
		<span class="uppercase">{$locale?.substring(0, 2) ?? 'ru'}</span>
	</button>

	{#if open}
		<div
			class="absolute top-full right-0 z-50 mt-1 w-32 overflow-hidden rounded-lg border border-white/10 bg-slate-900 shadow-xl"
		>
			{#each languages as lang (lang.code)}
				<button
					onclick={() => handleSelect(lang.code)}
					class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition hover:bg-white/5"
					class:text-cyan-400={$locale?.startsWith(lang.code)}
					class:text-slate-300={!$locale?.startsWith(lang.code)}
				>
					<span class="font-mono text-xs">{lang.label}</span>
					<span>{lang.name}</span>
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
