import { browser } from '$app/environment';
import '$lib/i18n/index.js';
import { waitLocale } from 'svelte-i18n';
import type { LayoutLoad } from './$types.js';

export const load: LayoutLoad = async () => {
	if (browser) {
		await waitLocale();
	}
	return {};
};
