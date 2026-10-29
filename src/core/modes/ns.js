import { apiGet } from '../services/api.js';
import { pageItem } from '../items.js';
import icons from '../icons.js';
import { msg, matches } from '../text.js';
import { exactFirst, queryActions, userCanEdit } from '../results.js';
import { getSiteInfo } from '../services/siteinfo.js';
import { specialPageItems } from './action.js';

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
			const q = query.trim();
			const params = q ?
				{ action: 'query', list: 'prefixsearch', pssearch: q, psnamespace: ns, pslimit: LIMIT } :
				{ action: 'query', list: 'allpages', apnamespace: ns, aplimit: LIMIT };
			// Special pages have no allpages; siteinfo also matches their aliases
			const pages = ns === -1 ?
				getSiteInfo().then( ( info ) => specialPageItems( info, q ) ) :
				apiGet( params, signal ).then( ( data ) => ( data.query.prefixsearch || data.query.allpages || [] )
					.map( ( p ) => pageItem( p.title ) ).filter( Boolean ) );
			// Go to or create the typed title, as outside the namespace
			const t = q && mw.Title.makeTitle( ns, q );
			return Promise.all( [ pages, userCanEdit() ] ).then( ( [ items, canEdit ] ) => [ {
				id: 'pages',
				label: msg( 'tacp-group-pages' ),
				items: t ? exactFirst( items, t.getPrefixedText() ) : items
			}, {
				id: 'query',
				label: msg( 'tacp-group-query' ),
				items: t ? queryActions( t.getPrefixedText(), canEdit ) : []
			} ] );
		}
	};
}

/**
 * The namespace search for a namespace name typed before a colon, in any of
 * the forms the wiki accepts (local, canonical, aliases).
 *
 * @param {string} prefix e.g. "Template", "bản mẫu"
 * @return {Object|null} Mode, or null for the main namespace, Media: and non-namespaces
 */
export function namespaceForPrefix( prefix ) {
	const id = mw.config.get( 'wgNamespaceIds' )[ prefix.trim().replace( / /g, '_' ).toLowerCase() ];
	return id > 0 || id === -1 ? namespaceSearch( id, mw.config.get( 'wgFormattedNamespaces' )[ id ] ) : null;
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
			.filter( ( id ) => id >= -1 )
			.map( ( id ) => {
				const name = id === 0 ? msg( 'tacp-ns-main' ) : names[ id ];
				return { id: String( id ), label: name, badge: String( id ), icon: icons.folder, mode: namespaceSearch( id, name ) };
			} )
			.filter( ( item ) => matches( item.label, query ) );
		return [ { id: 'namespaces', label: msg( 'tacp-group-namespaces' ), items } ];
	}
};
