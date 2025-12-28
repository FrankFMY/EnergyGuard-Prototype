<script lang="ts">
	import { cn } from '$lib/utils.js';

	interface Props {
		class?: string;
		width?: string;
		height?: string;
		rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full' | 'xl';
	}

	const { class: className, width, height, rounded = 'md' }: Props = $props();

	const roundedClasses = {
		none: '',
		sm: 'rounded-sm',
		md: 'rounded-md',
		lg: 'rounded-lg',
		xl: 'rounded-xl',
		full: 'rounded-full'
	};
</script>

<div
	class={cn('animate-pulse bg-slate-800', roundedClasses[rounded], className)}
	style:width
	style:height
></div>
