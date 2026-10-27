import { apiGet } from './api.js';

const KEY = 'tacp-siteinfo-v1-' + mw.config.get( 'wgWikiID' );
const DAY = 86400;
let promise = null;

/**
 * Installed extensions, namespaces and special page aliases, cached in
 * localStorage for a day so most opens cost no request.
 *
 * @return {Promise<{extensions: string[], namespaces: Object[], specialPages: Object[]}>}
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
		siprop: 'extensions|namespaces|specialpagealiases'
	} ).then( ( data ) => {
		const q = data.query;
		const info = {
			extensions: q.extensions.map( ( ext ) => ext.name ),
			namespaces: Object.keys( q.namespaces ).map( ( id ) => ( {
				id: Number( id ),
				name: q.namespaces[ id ].name,
				content: !!q.namespaces[ id ].content
			} ) ),
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
