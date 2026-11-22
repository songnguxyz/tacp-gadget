import { apiGet } from './api.js';
import { thumbWidth } from '../items.js';

const BATCH_DELAY = 50;
// Title → Promise of a URL (or null), for the session
const cache = new Map();
let queue = null;

function flush() {
	const batch = queue;
	queue = null;
	// Up to 50 titles per request; a batch is the rows that came into view together
	const titles = Array.from( batch.keys() );
	for ( let i = 0; i < titles.length; i += 50 ) {
		const chunk = titles.slice( i, i + 50 );
		apiGet( {
			action: 'query',
			titles: chunk.join( '|' ),
			prop: 'pageimages',
			piprop: 'thumbnail',
			pithumbsize: thumbWidth()
		} ).then( ( data ) => {
			const q = data.query || {};
			const urls = new Map( ( q.pages || [] )
				.map( ( p ) => [ p.title, p.thumbnail && p.thumbnail.source ] ) );
			const renamed = new Map( ( q.normalized || [] ).map( ( n ) => [ n.from, n.to ] ) );
			chunk.forEach( ( t ) => batch.get( t )( urls.get( renamed.get( t ) || t ) || null ) );
		} ).catch( () => chunk.forEach( ( t ) => batch.get( t )( null ) ) );
	}
}

/**
 * A page's thumbnail at 40px × devicePixelRatio, through the PageImages
 * API. Calls made within 50 ms share one request.
 *
 * @param {string} title
 * @return {Promise<string|null>}
 */
export function sharpThumb( title ) {
	if ( !cache.has( title ) ) {
		if ( !queue ) {
			queue = new Map();
			setTimeout( flush, BATCH_DELAY );
		}
		cache.set( title, new Promise( ( resolve ) => {
			queue.set( title, resolve );
		} ) );
	}
	return cache.get( title );
}
