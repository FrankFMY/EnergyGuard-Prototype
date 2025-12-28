<script lang="ts">
	import { spring } from 'svelte/motion';
	import { untrack } from 'svelte';

	const { value, currency = 'RUB' } = $props();

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
</script>

<span class="tracking-tight tabular-nums">
	{Math.round($displayedValue).toLocaleString()}
	<span class="ml-1 text-xs font-normal text-slate-500">{currency}</span>
</span>
