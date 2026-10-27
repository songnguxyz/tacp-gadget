import icons from './icons.js';
import { msg, text, matches } from './text.js';
import { pageItem, safeUrl } from './items.js';
import { isAbort } from './services/api.js';
import { getRecent } from './services/recent.js';
import { searchTitles } from './providers/search.js';
import { getRelated } from './providers/related.js';
import { SUGGESTED } from './providers/commands.js';

const RECENT_SHOWN = 5;
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

function queryActions( query, canEdit ) {
	const t = mw.Title.newFromText( query.trim() );
	const items = [];
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
		pending = Promise.all( [ soft( searchTitles( query.trim(), signal ) ), userCanEdit() ] ).then( ( [ results, canEdit ] ) => [
			group( 'results', results ),
			group( 'commands', commands
				.filter( ( c ) => matches( text( c.label ), query ) )
				.map( ( c ) => commandItem( c, context ) ) ),
			group( 'query', queryActions( query, canEdit ) )
		] );
	}
	return pending.then( ( list ) => normalizeGroups( list, 'tacp' ) );
}
