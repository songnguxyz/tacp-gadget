import { apiGet, restGet, isAbort } from '../services/api.js';
import { pageItem } from '../items.js';

const LIMIT = 10;
let restBroken = false;

function viaRest( query, signal ) {
	return restGet( '/v1/search/title?limit=' + LIMIT + '&q=' + encodeURIComponent( query ), signal )
		.then( ( data ) => data.pages.map( ( page ) => pageItem( page.title, {
			description: page.description || '',
			thumbnail: page.thumbnail && page.thumbnail.url ? { url: page.thumbnail.url } : null,
			redirectFrom: page.matched_title || ''
		} ) ) );
}

function viaOpensearch( query, signal ) {
	return apiGet( { action: 'opensearch', search: query, limit: LIMIT }, signal )
		.then( ( data ) => data[ 1 ].map( ( title, i ) => pageItem( title, {
			description: data[ 2 ][ i ] || ''
		} ) ) );
}

/**
 * Title search: REST first, action=opensearch when rest.php is unavailable.
 *
 * @param {string} query
 * @param {AbortSignal} signal
 * @return {Promise<Object[]>} Page items
 */
export function searchTitles( query, signal ) {
	const run = restBroken ? viaOpensearch( query, signal ) : viaRest( query, signal ).catch( ( err ) => {
		if ( isAbort( err ) ) {
			throw err;
		}
		restBroken = true;
		return viaOpensearch( query, signal );
	} );
	return run.then( ( items ) => items.filter( Boolean ) );
}

function plainText( html ) {
	// DOMParser documents are inert: no scripts run, no images load
	return new DOMParser().parseFromString( html, 'text/html' ).body.textContent;
}

/**
 * Full-text search through CirrusSearch: matching pages with a snippet, and
 * its "did you mean" suggestion.
 *
 * @param {string} query
 * @param {AbortSignal} signal
 * @return {Promise<{items: Object[], suggestion: string}>}
 */
export function searchText( query, signal ) {
	return apiGet( {
		action: 'query',
		list: 'search',
		srsearch: query,
		srlimit: 5,
		srprop: 'snippet',
		srinfo: 'suggestion'
	}, signal ).then( ( data ) => ( {
		items: data.query.search
			.map( ( page ) => pageItem( page.title, { description: plainText( page.snippet || '' ) } ) )
			.filter( Boolean ),
		suggestion: ( data.query.searchinfo && data.query.searchinfo.suggestion ) || ''
	} ) );
}
