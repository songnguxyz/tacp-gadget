// Test configuration. The build itself lives in scripts/build.js.
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig( {
	plugins: [ vue() ],
	resolve: {
		alias: { 'ext.gadget.TACP': new URL( './test/stubs/loader.js', import.meta.url ).pathname }
	},
	test: {
		environment: 'jsdom',
		setupFiles: [ './test/setup.js' ]
	}
} );
