import { getSiteInfo } from '../services/siteinfo.js';
import { pageItem, safeUrl } from '../items.js';
import icons from '../icons.js';
import { msg, matches } from '../text.js';

const SPECIAL_SHOWN = 20;

// Page actions are content actions (ca-*) and the portlets that hold them
const PAGE_PORTLETS = [ 'p-views', 'p-cactions', 'p-namespaces', 'p-associated-pages' ];
// Icons for the menu links MediaWiki and common extensions give an id;
// any other link (e.g. from a gadget) keeps the function icon
const LINK_ICONS = {
	'ca-view': 'article', 'ca-talk': 'speechBubbles', 'ca-edit': 'edit', 'ca-ve-edit': 'edit',
	'ca-viewsource': 'code', 'ca-addsection': 'add', 'ca-history': 'history', 'ca-watch': 'star',
	'ca-unwatch': 'unStar', 'ca-move': 'move', 'ca-delete': 'trash', 'ca-undelete': 'restore',
	'ca-protect': 'lock', 'ca-unprotect': 'unLock', 'ca-purge': 'reload',
	't-whatlinkshere': 'link', 't-recentchangeslinked': 'recentChanges', 't-upload': 'upload',
	't-specialpages': 'specialPages', 't-permalink': 'link', 't-info': 'info', 't-cite': 'quotes',
	't-print': 'printer', 't-wikibase': 'logoWikidata', 't-urlshortener': 'link',
	't-urlshortener-qrcode': 'qrCode', 'coll-download-as-rl': 'download', 't-contributions': 'userContributions',
	't-log': 'listBullet', 't-emailuser': 'message', 't-userrights': 'userGroup',
	'pt-userpage': 'user', 'pt-mytalk': 'userTalk', 'pt-preferences': 'settings', 'pt-watchlist': 'watchlist',
	'pt-mycontris': 'userContributions', 'pt-logout': 'logOut', 'pt-login': 'logIn', 'pt-login-private': 'logIn',
	'pt-notifications-alert': 'bell', 'pt-notifications-notice': 'message',
	'n-mainpage-description': 'home', 'n-randompage': 'die', 'n-recentchanges': 'recentChanges', 'n-help': 'help'
};
const linkIcon = ( id ) => icons[ /^ca-nstab-/.test( id ) ? 'article' : LINK_ICONS[ id ] ] || icons.function;
const clean = ( s ) => ( s || '' ).replace( /\s+/g, ' ' ).trim();

function portletLabel( portlet ) {
	const heading = portlet.querySelector( '.vector-menu-heading, .vector-pinnable-header-label, h3' );
	return clean( heading ? heading.textContent : portlet.getAttribute( 'aria-label' ) );
}

/**
 * Every link the skin and other gadgets put in its menus (portlets), grouped
 * by menu, page actions first. Including gadget menus (e.g. Twinkle) follows
 * the command palette user scripts by Peter Coombe (User:The wub) and
 * User:DLynch (WMF), Wikimedia Hackathon 2026 (T425060); no code copied.
 * Languages are left to the /lang mode.
 *
 * Items navigate to the link's URL rather than clicking it, so TACP never
 * triggers a skin's write action (e.g. an AJAX watch star).
 *
 * @return {Object[]} Groups
 */
function readPortletGroups() {
	const seen = new Set();
	const groups = new Map( [ [ 'page', { id: 'page', label: msg( 'tacp-group-page-actions' ), items: [] } ] ] );
	Array.from( document.querySelectorAll( '.mw-portlet li > a, li[id^="ca-"] > a, li[id^="t-"] > a, a[id^="ca-"]' ) ).forEach( ( a ) => {
		const href = a.getAttribute( 'href' );
		const url = safeUrl( href );
		const label = clean( a.textContent ) || clean( a.title ) || clean( a.getAttribute( 'aria-label' ) );
		if ( !url || href === '#' || !label || seen.has( url ) || a.closest( '#p-lang, .interlanguage-link' ) ) {
			return;
		}
		seen.add( url );
		const li = a.closest( 'li' );
		const portlet = a.closest( '.mw-portlet' );
		const isPage = /^ca-/.test( a.id ) || ( li && /^ca-/.test( li.id ) ) ||
			( portlet && PAGE_PORTLETS.includes( portlet.id ) );
		const key = isPage ? 'page' : ( portlet && portlet.id ) || 'tools';
		if ( !groups.has( key ) ) {
			groups.set( key, { id: key, label: ( portlet && portletLabel( portlet ) ) || msg( 'tacp-group-tools' ), items: [] } );
		}
		const id = a.id || ( li && li.id ) || url;
		groups.get( key ).items.push( { id, label, description: clean( a.title ), url, icon: linkIcon( id ) } );
	} );
	return Array.from( groups.values() );
}

/**
 * Special pages whose name or an alias matches, from siteinfo: no request
 * when siteinfo is cached, and matches inside names, not only prefixes.
 *
 * @param {Object} info From getSiteInfo()
 * @param {string} query
 * @return {Object[]} Page items
 */
export function specialPageItems( info, query ) {
	return info.specialPages
		.filter( ( sp ) => sp.aliases.concat( sp.name ).some( ( a ) => matches( a, query ) ) )
		.slice( 0, SPECIAL_SHOWN )
		.map( ( sp ) => pageItem( mw.Title.makeTitle( -1, sp.aliases[ 0 ] || sp.name ) ) )
		.filter( Boolean );
}

export default {
	id: 'tacp-action',
	trigger: '/action',
	label: 'tacp-mode-action',
	description: 'tacp-mode-action-desc',
	icon: icons.specialPages,
	getResults( query ) {
		const menus = readPortletGroups().map( ( g ) => Object.assign( {}, g, {
			items: g.items.filter( ( item ) => matches( item.label + ' ' + item.description + ' ' + g.label, query ) )
		} ) );
		return getSiteInfo().then( ( info ) => menus.concat( {
			id: 'special', label: msg( 'tacp-group-special' ), items: specialPageItems( info, query )
		} ) );
	}
};
