import rawConfig from './TACP-config.json';
import { normalizeConfig } from '../shared/config.js';
import { loadMessages } from '../shared/messages.js';
import { shortcutFor } from './shortcuts.js';
import './TACP.less';

// Original top-hat icon drawn for TACP: crown, band gap, brim
const HAT_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" aria-hidden="true">' +
	'<path fill="currentColor" d="M5 3a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v6H5zm0 8h10v2H5zm-4 3.5A1.5 1.5 0 0 1 2.5 13h15a1.5 1.5 0 0 1 0 3h-15A1.5 1.5 0 0 1 1 14.5z"/>' +
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
