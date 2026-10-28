import icons from './icons.js';
import { msg, text, matches } from './text.js';
import { pageItem, safeUrl } from './items.js';
import { isAbort } from './services/api.js';
import { getRecent } from './services/recent.js';
import { searchTitles, searchText } from './providers/search.js';
import { getSiteInfo } from './services/siteinfo.js';
import { getRelated } from './providers/related.js';
import { SUGGESTED } from './providers/commands.js';

const RECENT_SHOWN = 5;
// Full-text search is heavier than title search; skip it for very short input
const FULLTEXT_MIN = 3;
let rightsPromise = null;

function userCanEdit() {
	if ( !rightsPromise ) {
		rightsPromise = Promise.resolve( mw.user.getRights() ).then(
			( rights ) => rights.includes( 'edit' ),
			() => false
		);
	}
	return rightsPromise;
}

/**
 * A failing optional provider hides its group instead of failing the palette.
 *
 * @param {Promise<Object[]>} promise
 * @return {Promise<Object[]>}
 */
function soft( promise ) {
	return promise.catch( ( err ) => {
		if ( isAbort( err ) ) {
			throw err;
		}
		mw.log.warn( 'TACP:', err );
		return [];
	} );
}

function group( id, items ) {
	return { id, label: msg( 'tacp-group-' + id ), items };
}

const ICON_VALUES = Object.keys( icons ).map( ( name ) => icons[ name ] );

/**
 * Accept only icons TACP bundles, by value or by name. Some Codex icons are
 * SVG strings, so an unknown string must not reach CdxIcon.
 *
 * @param {*} icon
 * @return {string|Object|undefined}
 */
function resolveIcon( icon ) {
	if ( ICON_VALUES.includes( icon ) ) {
		return icon;
	}
	return typeof icon === 'string' && Object.prototype.hasOwnProperty.call( icons, icon ) ? icons[ icon ] : undefined;
}

/**
 * Run a command, asking first when it set confirm: true.
 *
 * @param {Object} cmd
 * @param {Object} context
 */
export function runCommand( cmd, context ) {
	// eslint-disable-next-line no-alert
	if ( cmd.confirm && !window.confirm( msg( 'tacp-confirm', text( cmd.label ) ) ) ) {
		return;
	}
	try {
		cmd.run( context );
	} catch ( e ) {
		mw.log.error( e );
	}
}

export function commandItem( cmd, context ) {
	return {
		id: 'cmd:' + cmd.id,
		label: text( cmd.label ),
		description: text( cmd.description ),
		icon: resolveIcon( cmd.icon ) || icons.function,
		run: () => runCommand( cmd, context )
	};
}

export function modeItem( mode ) {
	return {
		id: 'mode:' + mode.id,
		label: text( mode.label ),
		badge: mode.trigger,
		description: text( mode.description ),
		icon: icons.function,
		mode
	};
}

function str( v ) {
	return v === undefined || v === null ? '' : String( v );
}

/**
 * Make result groups from any mode safe to render: plain strings only,
 * http(s) URLs only. Labels are never rendered as HTML.
 *
 * @param {Array} groups
 * @param {string} prefix Unique id prefix, e.g. the mode id
 * @return {Object[]}
 */
export function normalizeGroups( groups, prefix ) {
	if ( !Array.isArray( groups ) ) {
		return [];
	}
	return groups.filter( Boolean ).map( ( g, gi ) => ( {
		id: prefix + ':' + str( g.id || gi ),
		label: str( g.label ),
		items: ( Array.isArray( g.items ) ? g.items : [] ).filter( Boolean ).map( ( it, ii ) => ( {
			id: prefix + ':' + str( it.id || gi + '-' + ii ),
			label: str( it.label ),
			description: str( it.description ),
			badge: str( it.badge ),
			redirectFrom: str( it.redirectFrom ),
			title: str( it.title ),
			icon: resolveIcon( it.icon ),
			thumbnail: it.thumbnail && safeUrl( it.thumbnail.url ) ? { url: safeUrl( it.thumbnail.url ) } : null,
			url: safeUrl( it.url ),
			run: typeof it.run === 'function' ? it.run : null,
			mode: it.mode && typeof it.mode.getResults === 'function' ? it.mode : null,
			query: typeof it.query === 'string' ? it.query : null,
			actions: ( Array.isArray( it.actions ) ? it.actions : [] ).filter( Boolean ).map( ( a, ai ) => ( {
				id: str( a.id || ai ),
				label: str( a.label ),
				icon: resolveIcon( a.icon ) || icons.next,
				url: safeUrl( a.url ),
				run: typeof a.run === 'function' ? a.run : null
			} ) ).filter( ( a ) => a.url || a.run )
		} ) )
	} ) ).filter( ( g ) => g.items.length );
}

/**
 * Like the skin's search box, Enter should go to the page whose title is
 * exactly what was typed: move that result (or the redirect to it) first.
 *
 * @param {Object[]} items Page items
 * @param {string} query
 * @return {Object[]}
 */
export function exactFirst( items, query ) {
	const t = mw.Title.newFromText( query.trim() );
	const target = t && t.getPrefixedText();
	const same = ( title ) => {
		const other = title && mw.Title.newFromText( title );
		return !!other && other.getPrefixedText() === target;
	};
	const i = target ? items.findIndex( ( it ) => same( it.title ) || same( it.redirectFrom ) ) : -1;
	return i > 0 ? [ items[ i ] ].concat( items.slice( 0, i ), items.slice( i + 1 ) ) : items;
}

/**
 * CirrusSearch full text, only when the wiki has it and the input is long enough.
 *
 * @param {string} query
 * @param {AbortSignal} signal
 * @return {Promise<{items: Object[], suggestion: string}>}
 */
function fullText( query, signal ) {
	const none = { items: [], suggestion: '' };
	if ( query.length < FULLTEXT_MIN ) {
		return Promise.resolve( none );
	}
	return getSiteInfo()
		.then( ( info ) => ( info.extensions.includes( 'CirrusSearch' ) ? searchText( query, signal ) : none ) )
		.catch( ( err ) => {
			if ( isAbort( err ) ) {
				throw err;
			}
			mw.log.warn( 'TACP:', err );
			return none;
		} );
}

function queryActions( query, canEdit, suggestion ) {
	const t = mw.Title.newFromText( query.trim() );
	const items = [];
	if ( suggestion ) {
		items.push( { id: 'suggestion', label: msg( 'tacp-query-suggestion', suggestion ), icon: icons.search, query: suggestion } );
	}
	if ( t ) {
		items.push( { id: 'go', label: msg( 'tacp-query-go', t.getPrefixedText() ), icon: icons.next, url: t.getUrl(), title: t.getPrefixedText() } );
	}
	items.push( {
		id: 'fulltext',
		label: msg( 'tacp-query-fulltext', query.trim() ),
		icon: icons.search,
		url: mw.util.getUrl( 'Special:Search', { search: query.trim(), fulltext: '1' } )
	} );
	if ( t && canEdit && t.getNamespaceId() >= 0 ) {
		items.push( { id: 'edit', label: msg( 'tacp-query-edit', t.getPrefixedText() ), icon: icons.edit, url: t.getUrl( { action: 'edit' } ) } );
	}
	return items;
}

/**
 * Everything the palette shows for one state of the input.
 *
 * @param {Object} state
 * @param {string} state.query Input text, without any mode trigger
 * @param {Object|null} state.mode Active mode
 * @param {Object} state.context Page context
 * @param {Object} state.registry
 * @param {AbortSignal} signal
 * @return {Promise<Object[]>} Groups, each with id, label and items
 */
export function getGroups( { query, mode, context, registry }, signal ) {
	if ( mode ) {
		return Promise.resolve()
			.then( () => mode.getResults( query, context, signal ) )
			.then( ( groups ) => normalizeGroups( groups, mode.id ) );
	}
	const commands = registry.getCommands( context );
	let pending;
	if ( query.charAt( 0 ) === '/' ) {
		const token = query.slice( 1 ).trim().toLowerCase();
		pending = Promise.resolve( [ group( 'commands', registry.getModes( context )
			.filter( ( m ) => m.trigger.slice( 1 ).toLowerCase().indexOf( token ) === 0 || matches( text( m.label ), token ) )
			.map( modeItem ) ) ] );
	} else if ( !query.trim() ) {
		pending = soft( getRelated( context, signal ) ).then( ( related ) => [
			group( 'recent', getRecent().slice( 0, RECENT_SHOWN ).map( ( e ) => pageItem( e.title ) ).filter( Boolean ) ),
			group( 'related', related ),
			group( 'commands', SUGGESTED
				.map( ( id ) => commands.find( ( c ) => c.id === id ) )
				.filter( Boolean )
				.map( ( c ) => commandItem( c, context ) ) )
		] );
	} else {
		const q = query.trim();
		pending = Promise.all( [ soft( searchTitles( q, signal ) ), userCanEdit(), fullText( q, signal ) ] )
			.then( ( [ results, canEdit, full ] ) => {
				const seen = new Set( results.map( ( it ) => it.title ) );
				return [
					group( 'results', exactFirst( results, q ) ),
					group( 'fulltext', full.items.filter( ( it ) => !seen.has( it.title ) ) ),
					group( 'commands', commands
						.filter( ( c ) => matches( text( c.label ), query ) )
						.map( ( c ) => commandItem( c, context ) ) ),
					group( 'query', queryActions( query, canEdit, full.suggestion ) )
				];
			} );
	}
	return pending.then( ( list ) => normalizeGroups( list, 'tacp' ) );
}
