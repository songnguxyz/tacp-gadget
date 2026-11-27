import icons from './icons.js';
import { msg } from './text.js';

/**
 * Copy text and tell the user how it went.
 *
 * @param {string} str
 * @return {Promise}
 */
export function copyText( str ) {
	// eslint-disable-next-line compat/compat -- feature-checked here
	const done = navigator.clipboard ? navigator.clipboard.writeText( str ) : Promise.reject();
	return done.then(
		() => mw.notify( msg( 'tacp-copied' ) ),
		() => mw.notify( msg( 'tacp-copy-failed' ), { type: 'error' } )
	);
}

/**
 * Only http(s) and relative URLs may be navigated to; anything else
 * (javascript:, data:) from a registered mode is dropped.
 *
 * @param {string} url
 * @return {string|null} Absolute URL
 */
export function safeUrl( url ) {
	if ( typeof url !== 'string' || !url ) {
		return null;
	}
	try {
		const abs = new URL( url, location.href );
		return abs.protocol === 'http:' || abs.protocol === 'https:' ? abs.href : null;
	} catch ( e ) {
		return null;
	}
}

// Files with no picture to show
const AUDIO = /\.(?:mp3|ogg|oga|opus|wav|flac|m4a|aac|mid|midi)$/i;

// Codex thumbnails are 40 CSS pixels wide
const THUMB_CSS_WIDTH = 40;

/**
 * Thumbnail width in device pixels: 40 × devicePixelRatio, at most 3×.
 *
 * @return {number}
 */
export function thumbWidth() {
	const ratio = Math.min( Math.max( window.devicePixelRatio || 1, 1 ), 3 );
	return Math.round( THUMB_CSS_WIDTH * ratio );
}

/**
 * Result item for a wiki page, with the standard secondary actions.
 *
 * @param {string|mw.Title} title
 * @param {Object} [extra] Fields to add or override
 * @return {Object|null}
 */
export function pageItem( title, extra ) {
	const t = typeof title === 'string' ? mw.Title.newFromText( title ) : title;
	if ( !t ) {
		return null;
	}
	const ns = t.getNamespaceId();
	const prefixed = t.getPrefixedText();
	const isFile = ns === 6;
	const isAudio = isFile && AUDIO.test( prefixed );
	const actions = ns < 0 ? [] : [
		{ id: 'edit', label: msg( 'tacp-action-edit' ), icon: icons.edit, url: t.getUrl( { action: 'edit' } ) },
		{ id: 'history', label: msg( 'tacp-action-history' ), icon: icons.history, url: t.getUrl( { action: 'history' } ) }
	];
	const item = Object.assign( {
		id: 'page:' + prefixed,
		label: ns === 0 ? prefixed : t.getMainText(),
		badge: ns === 0 ? '' : mw.config.get( 'wgFormattedNamespaces' )[ ns ] || '',
		title: prefixed,
		url: t.getUrl(),
		icon: isAudio ? icons.volumeUp : isFile ? icons.image : ns < 0 ? icons.specialPages : icons.article,
		actions
	}, extra );
	// A file shows itself, scaled by Special:Redirect/file: no API request.
	// From the whostacking/palette fork.
	if ( isFile && !isAudio && !item.thumbnail ) {
		item.thumbnail = {
			url: mw.util.getUrl( 'Special:Redirect/file/' + t.getMainText(), { width: thumbWidth() } ),
			width: thumbWidth()
		};
	}
	return item;
}
