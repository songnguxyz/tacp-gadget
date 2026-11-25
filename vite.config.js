// Test configuration. The build itself lives in scripts/build.js.
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { readMessages } from './scripts/messages.js';

export default defineConfig( {
	plugins: [ vue() ],
	define: { __TACP_VERSION__: '"0.0.0-test"', __MESSAGES__: JSON.stringify( readMessages() ) },
	resolve: {
		alias: { 'ext.gadget.TACP': new URL( './test/stubs/loader.js', import.meta.url ).pathname }
	},
	test: {
		environment: 'jsdom',
		setupFiles: [ './test/setup.js' ]
	}
} );
