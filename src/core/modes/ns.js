import { apiGet } from '../services/api.js';
import { pageItem } from '../items.js';
import icons from '../icons.js';
import { msg, matches } from '../text.js';

const LIMIT = 10;

/**
 * Sub-mode entered after picking a namespace: page search within it.
 *
 * @param {number} ns
 * @param {string} name
 * @return {Object}
 */
function namespaceSearch( ns, name ) {
	return {
		id: 'tacp-ns-' + ns,
		label: name,
		getResults( query, context, signal ) {
			const params = query.trim() ?
				{ action: 'query', list: 'prefixsearch', pssearch: query.trim(), psnamespace: ns, pslimit: LIMIT } :
				{ action: 'query', list: 'allpages', apnamespace: ns, aplimit: LIMIT };
			return apiGet( params, signal ).then( ( data ) => {
				const pages = data.query.prefixsearch || data.query.allpages || [];
				return [ {
					id: 'pages',
					label: msg( 'tacp-group-pages' ),
					items: pages.map( ( p ) => pageItem( p.title ) )
				} ];
			} );
		}
	};
}

export default {
	id: 'tacp-ns',
	trigger: '/ns',
	label: 'tacp-mode-ns',
	description: 'tacp-mode-ns-desc',
	getResults( query ) {
		const names = mw.config.get( 'wgFormattedNamespaces' );
		const items = Object.keys( names )
			.map( Number )
			.filter( ( id ) => id >= 0 )
			.map( ( id ) => {
				const name = id === 0 ? msg( 'tacp-ns-main' ) : names[ id ];
				return { id: String( id ), label: name, badge: String( id ), icon: icons.folder, mode: namespaceSearch( id, name ) };
			} )
			.filter( ( item ) => matches( item.label, query ) );
		return [ { id: 'namespaces', label: msg( 'tacp-group-namespaces' ), items } ];
	}
};
