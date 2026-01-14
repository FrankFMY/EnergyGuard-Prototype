<script lang="ts">
	import { _ } from 'svelte-i18n';
</script>

<a
	href="#main-content"
	class="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-100 focus:rounded-lg focus:bg-cyan-500 focus:px-4 focus:py-2 focus:text-white focus:shadow-lg focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-950 focus:outline-none"
>
	{$_('common.skipToContent') || 'Skip to main content'}
</a>
