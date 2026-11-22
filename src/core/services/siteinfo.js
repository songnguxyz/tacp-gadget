import { apiGet } from './api.js';

const KEY = 'tacp-siteinfo-v1-' + mw.config.get( 'wgWikiID' );
const DAY = 86400;
let promise = null;

/**
 * Installed extensions and special page aliases, cached in
 * localStorage for a day so most opens cost no request.
 *
 * @return {Promise<{extensions: string[], specialPages: Object[]}>}
 */
export function getSiteInfo() {
	if ( promise ) {
		return promise;
	}
	let cached = null;
	try {
		cached = mw.storage.getObject( KEY );
	} catch ( e ) {}
	if ( cached && Array.isArray( cached.extensions ) ) {
		promise = Promise.resolve( cached );
		return promise;
	}
	promise = apiGet( {
		action: 'query',
		meta: 'siteinfo',
		siprop: 'extensions|specialpagealiases'
	} ).then( ( data ) => {
		const q = data.query;
		const info = {
			extensions: q.extensions.map( ( ext ) => ext.name ),
			specialPages: q.specialpagealiases.map( ( sp ) => ( {
				name: sp.realname,
				aliases: sp.aliases
			} ) )
		};
		try {
			mw.storage.setObject( KEY, info, DAY );
		} catch ( e ) {}
		return info;
	}, ( err ) => {
		promise = null;
		throw err;
	} );
	return promise;
}
