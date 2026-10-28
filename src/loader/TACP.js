import rawConfig from './TACP-config.json';
import { normalizeConfig } from '../shared/config.js';
import { loadMessages } from '../shared/messages.js';
import { shortcutFor } from './shortcuts.js';
import './TACP.less';

// Original top-hat icon drawn for TACP: tall crown, band gap, upturned brim
const HAT_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" aria-hidden="true">' +
	'<path fill="currentColor" d="M5.5 2a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v8h-9zm0 9.5h9v4.2h-9zM.5 14.6c0-.9.8-1.2 1.6-.8C4.2 14.8 6.9 15.3 10 15.3s5.8-.5 7.9-1.5c.8-.4 1.6-.1 1.6.8 0 1.8-4.2 3.4-9.5 3.4S.5 16.4.5 14.6z"/>' +
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
			button.title = mw.msg( 'tacp-loader-button' );
			button.setAttribute( 'aria-label', button.title );
			button.innerHTML = HAT_SVG;
			button.addEventListener( 'click', () => open().catch( noop ) );
			document.body.appendChild( button );
		} );
	}

	if ( config.prefetch ) {
		mw.requestIdleCallback( () => mw.loader.load( 'ext.gadget.TACP-core' ) );
	}
}
