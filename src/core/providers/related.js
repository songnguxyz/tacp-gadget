import { apiGet } from '../services/api.js';
import { getSiteInfo } from '../services/siteinfo.js';
import { pageItem } from '../items.js';

const LIMIT = 5;
const PROPS = { prop: 'pageimages|description', piprop: 'thumbnail', pithumbsize: 80 };

function toItems( data ) {
	const pages = ( data.query && data.query.pages ) || [];
	return pages
		.filter( ( p ) => !p.missing )
		.sort( ( a, b ) => ( a.index || 0 ) - ( b.index || 0 ) )
		.slice( 0, LIMIT )
		.map( ( p ) => pageItem( p.title, {
			description: p.description || '',
			thumbnail: p.thumbnail ? { url: p.thumbnail.source } : null
		} ) )
		.filter( Boolean );
}

/**
 * Related pages: RelatedArticles' curated list if any, else CirrusSearch
 * morelike:, else nothing. Only on content pages.
 *
 * @param {Object} context
 * @param {AbortSignal} signal
 * @return {Promise<Object[]>}
 */
export function getRelated( context, signal ) {
	if ( !context.isArticle || context.articleId <= 0 ) {
		return Promise.resolve( [] );
	}
	return getSiteInfo().then( ( info ) => {
		const ns = info.namespaces.find( ( n ) => n.id === context.namespace );
		if ( !ns || !ns.content ) {
			return [];
		}
		const has = ( name ) => info.extensions.includes( name );
		const curated = mw.config.get( 'wgRelatedArticles' );
		if ( has( 'RelatedArticles' ) && Array.isArray( curated ) && curated.length ) {
			return apiGet( Object.assign( { action: 'query', titles: curated.slice( 0, LIMIT ).join( '|' ) }, PROPS ), signal )
				.then( toItems );
		}
		if ( has( 'CirrusSearch' ) ) {
			return apiGet( Object.assign( {
				action: 'query',
				generator: 'search',
				gsrsearch: 'morelike:' + context.title,
				gsrnamespace: context.namespace,
				gsrlimit: LIMIT
			}, PROPS ), signal ).then( toItems );
		}
		return [];
	} );
}
