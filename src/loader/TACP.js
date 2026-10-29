import rawConfig from './TACP-config.json';
import { normalizeConfig } from '../shared/config.js';
import { loadMessages } from '../shared/messages.js';
import { shortcutFor, takeoverTarget, SKIN_SEARCH_BUTTON } from './shortcuts.js';
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

// Keys typed while the core loads, or null when not loading
let typed = null;

function bufferKey( e ) {
	if ( e.isComposing || e.ctrlKey || e.metaKey || e.altKey ) {
		return;
	}
	if ( e.key.length === 1 ) {
		typed += e.key;
	} else if ( e.key === 'Backspace' ) {
		typed = typed.slice( 0, -1 );
	} else {
		return;
	}
	e.preventDefault();
	e.stopImmediatePropagation();
}

function takeTyped() {
	const text = typed || '';
	typed = null;
	document.removeEventListener( 'keydown', bufferKey, true );
	return text;
}

/**
 * Open the palette, loading the core first if needed. What the user types
 * during that first load goes into the palette instead of being lost.
 *
 * @param {string} [prefill] Text to put in the input, e.g. '/mygadget '
 * @return {Promise}
 */
export function open( prefill ) {
	if ( !enabled ) {
		return Promise.resolve();
	}
	if ( !core && typed === null ) {
		typed = '';
		document.addEventListener( 'keydown', bufferKey, true );
	}
	return Promise.resolve( loadCore() ).then( ( c ) => {
		const text = ( prefill || '' ) + takeTyped();
		return c.open( text || prefill );
	}, ( err ) => {
		takeTyped();
		throw err;
	} );
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
			// With takeover, the skin's own phone search button already opens TACP
			if ( config.searchTakeover && document.querySelector( SKIN_SEARCH_BUTTON ) ) {
				return;
			}
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

	if ( config.searchTakeover ) {
		// Capture phase on window runs before the skin's own handlers, so its
		// search dropdown or overlay never opens. Without JavaScript, or if the
		// core fails to load, the skin's search box works as before.
		let takeoverBroken = false;
		const intercept = ( e ) => {
			const el = !takeoverBroken && takeoverTarget( e );
			if ( !el ) {
				return;
			}
			e.preventDefault();
			e.stopImmediatePropagation();
			if ( e.type === 'mousedown' ) {
				// Keep focus (and the phone keyboard) out of the box; click opens
				return;
			}
			const value = typeof el.value === 'string' ? el.value.trim() : '';
			el.blur();
			open( value || undefined ).catch( () => {
				takeoverBroken = true;
				el.focus();
			} );
		};
		[ 'focus', 'mousedown', 'click' ].forEach( ( type ) => window.addEventListener( type, intercept, true ) );
	}

	if ( config.prefetch ) {
		mw.requestIdleCallback( () => mw.loader.load( 'ext.gadget.TACP-core' ) );
	}
}
