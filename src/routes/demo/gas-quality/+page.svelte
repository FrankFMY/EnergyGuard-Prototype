<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { GasQualitySlider } from '$lib/components/dashboard/index.js';
	import ArrowLeft from 'lucide-svelte/icons/arrow-left';
	import { Button } from '$lib/components/ui/index.js';
	import { base } from '$app/paths';

	const nominalPower = 1200;
	const baseTemp = 450;
</script>

<svelte:head>
	<title>{$_('demo.title')} | KASTOR</title>
</svelte:head>

<div class="mx-auto max-w-4xl space-y-8 p-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<Button variant="ghost" href={base} class="mb-4 gap-2 text-slate-400 hover:text-white">
				<ArrowLeft class="h-4 w-4" />
				{$_('engine.backToFleet')}
			</Button>
			<h1 class="text-3xl font-bold tracking-tight text-white">
				{$_('demo.title')}
			</h1>
			<p class="mt-2 text-slate-400">
				{$_('demo.subtitle')}
			</p>
		</div>
	</div>

	<!-- Main Slider Component -->
	<GasQualitySlider {nominalPower} {baseTemp} />

	<!-- Info Section -->
	<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
		<div class="rounded-xl border border-slate-800 bg-slate-900/30 p-6">
			<h3 class="mb-3 font-semibold text-white">{$_('demo.engineeringModel')}</h3>
			<p class="text-sm leading-relaxed text-slate-400">
				{$_('demo.engineeringModelDesc')}
			</p>
		</div>
		<div class="rounded-xl border border-slate-800 bg-slate-900/30 p-6">
			<h3 class="mb-3 font-semibold text-white">{$_('demo.financialImpact')}</h3>
			<p class="text-sm leading-relaxed text-slate-400">
				{$_('demo.financialImpactDesc')}
			</p>
		</div>
	</div>
</div>
