/**
 * Register bundled messages, then the wiki's overrides on top.
 * Most specific language wins: languages are applied from the end of the
 * fallback chain towards the user's language.
 *
 * @param {Object} bundles Messages keyed by language code
 * @param {Object} overrides The config's `messages` setting, same shape
 * @param {string[]} chain User language first, ending in 'en'
 */
export function loadMessages( bundles, overrides, chain ) {
	const langs = chain.slice().reverse();
	langs.forEach( ( lang ) => {
		if ( bundles[ lang ] ) {
			mw.messages.set( bundles[ lang ] );
		}
	} );
	langs.forEach( ( lang ) => {
		const set = overrides[ lang ];
		if ( !set || typeof set !== 'object' ) {
			return;
		}
		Object.keys( set ).forEach( ( key ) => {
			// A config page must not change other software's messages
			if ( key.indexOf( 'tacp-' ) === 0 && typeof set[ key ] === 'string' ) {
				mw.messages.set( key, set[ key ] );
			} else {
				mw.log.warn( 'TACP config: message override "' + key + '" ignored' );
			}
		} );
	} );
}
