import { reactive } from 'vue';

/** Shared open state between the public API (init.js) and App.vue */
export default reactive( {
	open: false,
	/** @type {string|null} Text to put in the input on open */
	prefill: null,
	/** @type {string|null} Enter pressed before the palette loaded: 'open', 'newtab' or 'edit' */
	enter: null
} );
