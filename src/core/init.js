import { createMwApp, watch } from 'vue';
import * as loader from 'ext.gadget.TACP';
import App from './App.vue';
import store from './store.js';
import icons from './icons.js';
import { loadMessages } from '../shared/messages.js';
import { createRegistry, defineMode, defineCommand } from './services/registry.js';
import { builtinCommands } from './providers/commands.js';
import nsMode from './modes/ns.js';
import actionMode from './modes/action.js';
import userMode from './modes/user.js';
import categoryMode from './modes/category.js';
import historyMode from './modes/history.js';
import createHelpMode from './modes/help.js';
import en from '../../i18n/en.json';
import vi from '../../i18n/vi.json';
import './styles.less';

/**
 * Open the palette.
 *
 * @param {string} [prefill] Text for the input; omitted uses the page selection
 */
export function open( prefill ) {
	if ( !store.open ) {
		store.prefill = typeof prefill === 'string' ? prefill : null;
		store.open = true;
	}
}

export function close() {
	store.open = false;
}

export function isOpen() {
	return store.open;
}

loadMessages( { en, vi }, loader.config.messages, mw.language.getFallbackLanguageChain() );

const registry = createRegistry( loader.config.disabledModes );
[ nsMode, actionMode, userMode, categoryMode, historyMode, createHelpMode( registry ) ]
	.forEach( ( spec ) => registry.register( defineMode( spec ), true ) );
builtinCommands.forEach( ( cmd ) => registry.register( cmd, true ) );

watch( () => store.open, ( value ) => loader.setOpenState( value ) );
createMwApp( App, { registry } ).mount( document.createElement( 'div' ) );

const api = Object.freeze( {
	apiVersion: 1,
	register: ( item ) => registry.register( item ),
	defineMode,
	defineCommand,
	icons,
	open,
	close
} );
mw.hook( 'tacp.register' ).fire( api );
mw.hook( 'tacp.ready' ).fire( api );
