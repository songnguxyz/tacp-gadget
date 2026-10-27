function getJson( url, signal ) {
	return fetch( url, { signal, credentials: 'same-origin' } ).then( ( res ) => {
		if ( !res.ok ) {
			throw new Error( 'HTTP ' + res.status + ' for ' + url );
		}
		return res.json();
	} );
}

/**
 * GET from this wiki's api.php. Uses fetch rather than mw.Api so every
 * request honours an AbortSignal on all supported MediaWiki versions.
 *
 * @param {Object} params
 * @param {AbortSignal} [signal]
 * @return {Promise<Object>}
 */
export function apiGet( params, signal ) {
	const query = new URLSearchParams( Object.assign( { format: 'json', formatversion: '2' }, params ) );
	return getJson( mw.util.wikiScript( 'api' ) + '?' + query, signal ).then( ( data ) => {
		if ( data.error ) {
			throw new Error( data.error.info || data.error.code );
		}
		return data;
	} );
}

/**
 * GET from this wiki's rest.php.
 *
 * @param {string} path e.g. '/v1/search/title?q=foo'
 * @param {AbortSignal} [signal]
 * @return {Promise<Object>}
 */
export function restGet( path, signal ) {
	return getJson( mw.config.get( 'wgScriptPath' ) + '/rest.php' + path, signal );
}

export function isAbort( err ) {
	return !!err && err.name === 'AbortError';
}
