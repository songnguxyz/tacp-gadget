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
	const actions = ns < 0 ? [] : [
		{ id: 'edit', label: msg( 'tacp-action-edit' ), icon: icons.edit, url: t.getUrl( { action: 'edit' } ) },
		{ id: 'history', label: msg( 'tacp-action-history' ), icon: icons.history, url: t.getUrl( { action: 'history' } ) },
		{ id: 'copy', label: msg( 'tacp-action-copy' ), icon: icons.link, run: () => copyText( safeUrl( t.getUrl() ) ) }
	];
	return Object.assign( {
		id: 'page:' + prefixed,
		label: ns === 0 ? prefixed : t.getMainText(),
		badge: ns === 0 ? '' : mw.config.get( 'wgFormattedNamespaces' )[ ns ] || '',
		title: prefixed,
		ns,
		url: t.getUrl(),
		icon: ns < 0 ? icons.specialPages : icons.article,
		actions
	}, extra );
}
