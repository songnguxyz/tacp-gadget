import { getSiteInfo } from '../services/siteinfo.js';
import { pageItem, safeUrl } from '../items.js';
import icons from '../icons.js';
import { msg, matches } from '../text.js';

const SPECIAL_SHOWN = 20;

/**
 * Page actions and tools the skin already shows, read from its portlets.
 * Items navigate to the link's URL rather than clicking it, so TACP never
 * triggers a skin's write action (e.g. an AJAX watch star).
 *
 * @return {Object[]}
 */
export function readPortletLinks() {
	const seen = new Set();
	const items = [];
	Array.from( document.querySelectorAll( 'li[id^="ca-"] > a, li[id^="t-"] > a, a[id^="ca-"]' ) ).forEach( ( a ) => {
		const url = safeUrl( a.getAttribute( 'href' ) );
		const label = ( a.textContent || a.title || a.getAttribute( 'aria-label' ) || '' ).replace( /\s+/g, ' ' ).trim();
		if ( !url || a.getAttribute( 'href' ) === '#' || !label || seen.has( url ) ) {
			return;
		}
		seen.add( url );
		items.push( { id: a.id || a.parentNode.id, label, description: a.title || '', url, icon: icons.function } );
	} );
	return items;
}

export default {
	id: 'tacp-action',
	trigger: '/action',
	label: 'tacp-mode-action',
	description: 'tacp-mode-action-desc',
	getResults( query ) {
		const actions = readPortletLinks().filter( ( item ) => matches( item.label, query ) );
		return getSiteInfo().then( ( info ) => {
			const special = info.specialPages
				.filter( ( sp ) => sp.aliases.concat( sp.name ).some( ( a ) => matches( a, query ) ) )
				.slice( 0, SPECIAL_SHOWN )
				.map( ( sp ) => pageItem( mw.Title.makeTitle( -1, sp.aliases[ 0 ] || sp.name ) ) )
				.filter( Boolean );
			return [
				{ id: 'page', label: msg( 'tacp-group-page-actions' ), items: actions },
				{ id: 'special', label: msg( 'tacp-group-special' ), items: special }
			];
		} );
	}
};
