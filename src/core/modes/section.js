import icons from '../icons.js';
import { msg, matches } from '../text.js';

// Idea from the command palette user scripts by Peter Coombe (User:The wub)
// and User:DLynch (WMF), Wikimedia Hackathon 2026 (T425060). No code copied.

const HEADINGS = [ 'h2', 'h3', 'h4', 'h5', 'h6' ].map( ( h ) => '#mw-content-text ' + h ).join( ', ' );
const clean = ( s ) => s.replace( /\s+/g, ' ' ).trim();

/**
 * Headings of the page content, numbered like the table of contents.
 * Reads both heading markups: `<h2 id>` (MediaWiki 1.43+) and
 * `<h2><span class="mw-headline" id>` (older parser output).
 *
 * @return {Object[]} Items
 */
export function readSections() {
	const found = Array.from( document.querySelectorAll( HEADINGS ) ).map( ( h ) => {
		const legacy = h.querySelector( '.mw-headline' );
		const id = legacy ? legacy.id : h.id;
		return id ? { h, id, level: Number( h.tagName.charAt( 1 ) ), label: clean( ( legacy || h ).textContent ) } : null;
	} ).filter( ( s ) => s && s.label );
	const top = Math.min.apply( null, found.map( ( s ) => s.level ) );
	const counters = [];
	return found.map( ( s ) => {
		// A skipped level (h2 then h4) nests one step, as the TOC does
		const depth = Math.min( s.level - top, counters.length );
		counters.length = depth + 1;
		counters[ depth ] = ( counters[ depth ] || 0 ) + 1;
		// DiscussionTools adds "Latest comment… · N comments" under talk page headings
		const meta = ( s.h.closest( '.mw-heading' ) || s.h ).querySelector( '.ext-discussiontools-init-section-metadata' );
		return {
			id: s.id,
			label: s.label,
			badge: counters.join( '.' ),
			description: meta ? clean( meta.textContent ) : '',
			icon: icons.listBullet,
			url: '#' + encodeURIComponent( s.id )
		};
	} );
}

export default {
	id: 'tacp-section',
	trigger: '/section',
	label: 'tacp-mode-section',
	description: 'tacp-mode-section-desc',
	isAvailable: () => !!document.querySelector( HEADINGS ),
	getResults( query ) {
		return [ {
			id: 'sections',
			label: msg( 'tacp-group-sections' ),
			items: readSections().filter( ( s ) => matches( s.label + ' ' + s.description, query ) )
		} ];
	}
};
