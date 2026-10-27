/**
 * @param {string} key
 * @param {...*} params
 * @return {string}
 */
export function msg( key, ...params ) {
	return mw.message( key, ...params ).text();
}

/**
 * Resolve a label that may be a message key or a plain string.
 *
 * @param {string} keyOrText
 * @return {string}
 */
export function text( keyOrText ) {
	if ( typeof keyOrText !== 'string' ) {
		return keyOrText === undefined || keyOrText === null ? '' : String( keyOrText );
	}
	return mw.message( keyOrText ).exists() ? mw.message( keyOrText ).text() : keyOrText;
}

/**
 * Split text around the first case-insensitive match of query, so the
 * template can bold it without ever rendering HTML.
 *
 * @param {string} str
 * @param {string} query
 * @return {{text: string, match: boolean}[]}
 */
export function highlight( str, query ) {
	const q = query.trim().toLowerCase();
	const i = q ? str.toLowerCase().indexOf( q ) : -1;
	if ( i === -1 ) {
		return [ { text: str, match: false } ];
	}
	return [
		{ text: str.slice( 0, i ), match: false },
		{ text: str.slice( i, i + q.length ), match: true },
		{ text: str.slice( i + q.length ), match: false }
	].filter( ( part ) => part.text );
}

/**
 * @param {string} haystack
 * @param {string} query
 * @return {boolean}
 */
export function matches( haystack, query ) {
	return String( haystack ).toLowerCase().includes( query.trim().toLowerCase() );
}
