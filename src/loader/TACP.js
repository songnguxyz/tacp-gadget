import rawConfig from './TACP-config.json';
import { normalizeConfig } from '../shared/config.js';
import { loadMessages } from '../shared/messages.js';
import { shortcutFor } from './shortcuts.js';
import { cdxIconSearch } from '@wikimedia/codex-icons';
import './TACP.less';

// Codex search icon (MIT), shrunk to make room for a four-point sparkle
const BUTTON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">' +
	'<g transform="translate(0 2) scale(.9)">' + cdxIconSearch + '</g>' +
	'<path d="M16.6.2l.84 2.16L19.6 3.2l-2.16.84L16.6 6.2l-.84-2.16L13.6 3.2l2.16-.84z"/>' +
	'</svg>';

export const config = normalizeConfig( rawConfig );

const enabled = mw.config.get( 'skin' ) !== 'citizen';
let core = null;
let loading = null;
let button = null;

function noop() {}

function loadCore() {
	if ( !loading ) {
		loading = mw.loader.using( 'ext.gadget.TACP-core' ).then(
			( req ) => {
				core = req( 'ext.gadget.TACP-core' );
				return core;
			},
			( err ) => {
				// Allow a retry on the next trigger
				loading = null;
				mw.notify( mw.msg( 'tacp-loader-error' ), { type: 'error' } );
				throw err;
			}
		);
	}
	return loading;
}

/**
 * Open the palette, loading the core first if needed.
 *
 * @param {string} [prefill] Text to put in the input, e.g. '/mygadget '
 * @return {Promise}
 */
export function open( prefill ) {
	if ( !enabled ) {
		return Promise.resolve();
	}
	return Promise.resolve( loadCore() ).then( ( c ) => c.open( prefill ) );
}

export function close() {
	if ( core ) {
		core.close();
	}
}

/**
 * Called by the core whenever the palette opens or closes.
 *
 * @private
 * @param {boolean} isOpen
 */
export function setOpenState( isOpen ) {
	if ( button ) {
		button.classList.toggle( 'tacp-mobile-button--hidden', isOpen );
	}
}

function toggle() {
	if ( core && core.isOpen() ) {
		core.close();
	} else {
		open().catch( noop );
	}
}

if ( enabled ) {
	const lang = mw.config.get( 'wgUserLanguage' );
	// eslint-disable-next-line no-undef
	loadMessages( __LOADER_MESSAGES__, config.messages, [ lang, lang.split( '-' )[ 0 ], 'en' ] );

	document.addEventListener( 'keydown', ( e ) => {
		const action = shortcutFor( e, config.slashShortcut );
		if ( action ) {
			e.preventDefault();
			if ( action === 'toggle' ) {
				toggle();
			} else {
				open().catch( noop );
			}
		}
	} );

	if ( config.mobileButton ) {
		$( () => {
			button = document.createElement( 'button' );
			button.type = 'button';
			button.className = 'tacp-mobile-button';
			const mac = /Mac|iPhone|iPad/.test( navigator.platform );
			button.title = mw.msg( 'tacp-loader-button-title', mac ? '⌘K' : 'Ctrl+K' );
			button.setAttribute( 'aria-label', mw.msg( 'tacp-loader-button' ) );
			button.setAttribute( 'aria-keyshortcuts', 'Control+K Meta+K' + ( config.slashShortcut ? ' /' : '' ) );
			button.innerHTML = BUTTON_SVG;
			button.addEventListener( 'click', () => open().catch( noop ) );
			document.body.appendChild( button );
		} );
	}

	if ( config.prefetch ) {
		mw.requestIdleCallback( () => mw.loader.load( 'ext.gadget.TACP-core' ) );
	}
}
