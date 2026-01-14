<script lang="ts">
	import { spring } from 'svelte/motion';
	import { untrack } from 'svelte';
	import { currency as currencyState } from '$lib/state/currency.svelte.js';

	const {
		value,
		isCurrency = false,
		unit = '',
		prefix = '',
		maximumFractionDigits = 0
	} = $props<{
		value: number;
		isCurrency?: boolean;
		unit?: string;
		prefix?: string;
		maximumFractionDigits?: number;
	}>();

	const displayedValue = spring(
		untrack(() => value),
		{
			stiffness: 0.1,
			damping: 0.5
		}
	);

	$effect(() => {
		displayedValue.set(value);
	});

	const formattedValue = $derived.by(() => {
		const val = $displayedValue;
		if (isCurrency) {
			const converted = val / currencyState.info.rate;
			return new Intl.NumberFormat(undefined, {
				maximumFractionDigits
			}).format(converted);
		}
		return new Intl.NumberFormat(undefined, {
			maximumFractionDigits
		}).format(val);
	});

	const symbol = $derived.by(() => {
		if (isCurrency) return currencyState.info.symbol;
		return unit;
	});
</script>

<span class="tracking-tight tabular-nums">
	{#if prefix}{prefix}{/if}{formattedValue}{#if symbol}<span
			class="ml-1 text-xs font-normal text-slate-500">{symbol}</span
		>{/if}
</span>
