import adapterAuto from '@sveltejs/adapter-auto';
import adapterNode from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

// Используем Node adapter для production/Docker, Auto adapter для development
const isProduction = process.env.NODE_ENV === 'production';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		// В production используем Node adapter для Docker
		// В development используем Auto adapter
		adapter: isProduction
			? adapterNode({
					out: 'build',
					precompress: true,
					envPrefix: ''
				})
			: adapterAuto()
	}
};

export default config;
