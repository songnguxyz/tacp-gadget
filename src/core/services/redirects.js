import { apiGet, isAbort } from './api.js';

// Typed title (lower case) → { from, to } or null, for the session
const cache = new Map();

const lower = ( title ) => {
	const t = title && mw.Title.newFromText( title );
	return t ? t.getPrefixedText().toLowerCase() : '';
};

/**
 * The page whose title is the typed one in another capitalisation, through
 * its redirect if it is one: { from: redirect or null, to: page }. Search
 * without CirrusSearch matches capitals exactly after the first letter, so
 * "passive block" would miss "Passive Block". Idea and first version from
 * the whostacking/palette fork. One request, and a second when the match is a
 * redirect.
 *
 * @param {string} text
 * @param {AbortSignal} signal
 * @return {Promise<{from: string|null, to: string}|null>}
 */
export function caseInsensitiveMatch( text, signal ) {
	const t = mw.Title.newFromText( text.trim() );
	const key = lower( text.trim() );
	// Prefix matching is exact after the first letter, so look up the first
	// word lower-cased and compare whole titles here
	const word = t && t.getMainText().split( ' ' )[ 0 ].toLowerCase();
	if ( !t || t.getNamespaceId() < 0 ) {
		return Promise.resolve( null );
	}
	if ( !cache.has( key ) ) {
		// ponytail: the first 500 pages starting with that word; a word that
		// starts more pages may miss the match
		// The API resolves no redirects for an allpages generator: a second
		// request does, only when the match is one
		cache.set( key, apiGet( {
			action: 'query',
			generator: 'allpages',
			gapprefix: word,
			gapnamespace: t.getNamespaceId(),
			gaplimit: 500,
			prop: 'info'
		}, signal ).then( ( data ) => {
			const page = ( ( data.query || {} ).pages || [] ).find( ( p ) => lower( p.title ) === key );
			if ( !page || !page.redirect ) {
				return page ? { from: null, to: page.title } : null;
			}
			return apiGet( { action: 'query', titles: page.title, redirects: 1 }, signal ).then( ( data2 ) => {
				const r = ( ( data2.query || {} ).redirects || [] )[ 0 ];
				return { from: page.title, to: r ? r.to : page.title };
			} );
		} ).catch( ( err ) => {
			cache.delete( key );
			if ( isAbort( err ) ) {
				throw err;
			}
			mw.log.warn( 'TACP:', err );
			return null;
		} ) );
	}
	return cache.get( key );
}
