import { apiGet } from '../services/api.js';
import { safeUrl } from '../items.js';
import icons from '../icons.js';
import { msg, matches } from '../text.js';

// Idea from the command palette user script by Peter Coombe (User:The wub),
// Wikimedia Hackathon 2026 (T425060). No code copied.

/**
 * Interlanguage links the skin rendered (desktop skins).
 *
 * @return {Object[]} Items
 */
export function readLanguageLinks() {
	return Array.from( document.querySelectorAll( 'li.interlanguage-link > a' ) ).map( ( a ) => {
		const code = a.getAttribute( 'hreflang' ) || a.getAttribute( 'lang' ) || '';
		return {
			id: code,
			label: a.textContent.replace( /\s+/g, ' ' ).trim(),
			badge: code,
			description: a.title || '',
			icon: icons.language,
			url: safeUrl( a.getAttribute( 'href' ) )
		};
	} ).filter( ( item ) => item.label && item.url );
}

// Minerva loads languages on demand, so ask the API when the page has none
function fromApi( articleId, signal ) {
	return apiGet( {
		action: 'query',
		prop: 'langlinks',
		pageids: articleId,
		llprop: 'url|langname|autonym',
		lllimit: 'max'
	}, signal ).then( ( data ) => ( ( data.query.pages[ 0 ] || {} ).langlinks || [] ).map( ( l ) => ( {
		id: l.lang,
		label: l.autonym || l.langname || l.lang,
		badge: l.lang,
		description: l.title + ( l.langname ? ' – ' + l.langname : '' ),
		icon: icons.language,
		url: l.url
	} ) ) );
}

export default {
	id: 'tacp-lang',
	trigger: '/lang',
	label: 'tacp-mode-lang',
	description: 'tacp-mode-lang-desc',
	isAvailable: ( context ) => context.articleId > 0 || !!document.querySelector( 'li.interlanguage-link' ),
	getResults( query, context, signal ) {
		const dom = readLanguageLinks();
		const items = dom.length || context.articleId <= 0 ? Promise.resolve( dom ) : fromApi( context.articleId, signal );
		return items.then( ( list ) => [ {
			id: 'languages',
			label: msg( 'tacp-group-languages' ),
			items: list.filter( ( l ) => matches( l.label + ' ' + l.description + ' ' + l.badge, query ) )
		} ] );
	}
};
