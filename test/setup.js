// Minimal mw.* stand-in for unit tests: just enough MediaWiki for TACP.
import { vi, beforeEach } from 'vitest';
import en from '../i18n/en.json';

const NS = { '': 0, talk: 1, user: 2, 'user talk': 3, project: 4, file: 6, category: 14, special: -1 };
const NS_NAMES = { 0: '', 1: 'Talk', 2: 'User', 3: 'User talk', 4: 'Project', 6: 'File', 14: 'Category', '-1': 'Special' };
const ucfirst = ( s ) => s.charAt( 0 ).toUpperCase() + s.slice( 1 );

class Title {
	constructor( ns, main ) {
		this.ns = ns;
		this.main = main;
	}

	static makeTitle( ns, main ) {
		main = String( main ).replace( /_/g, ' ' ).trim();
		return !main || /[<>[\]{}|#]/.test( main ) ? null : new Title( ns, ucfirst( main ) );
	}

	static newFromText( text ) {
		const m = /^([^:]+):(.*)$/.exec( String( text ).replace( /_/g, ' ' ) );
		const ns = m && NS[ m[ 1 ].trim().toLowerCase() ];
		return ns !== undefined && ns !== null ? Title.makeTitle( ns, m[ 2 ] ) : Title.makeTitle( 0, text );
	}

	getNamespaceId() {
		return this.ns;
	}

	getMainText() {
		return this.main;
	}

	getPrefixedText() {
		return ( this.ns ? NS_NAMES[ this.ns ] + ':' : '' ) + this.main;
	}

	getUrl( params ) {
		return global.mw.util.getUrl( this.getPrefixedText(), params );
	}

	getTalkPage() {
		return new Title( this.ns % 2 ? this.ns : this.ns + 1, this.main );
	}

	getSubjectPage() {
		return new Title( this.ns % 2 ? this.ns - 1 : this.ns, this.main );
	}
}

function format( str, params ) {
	return str
		.replace( /\{\{PLURAL:\$(\d)\|([^|]*)\|([^}]*)\}\}/g, ( m, i, one, many ) => ( Number( params[ i - 1 ] ) === 1 ? one : many ) )
		.replace( /\$(\d)/g, ( m, i ) => params[ i - 1 ] );
}

function createMw() {
	const messages = new Map();
	const config = new Map();
	const storage = new Map();
	return {
		config: {
			get: ( key ) => config.get( key ),
			set: ( key, value ) => config.set( key, value ),
			_map: config
		},
		messages: {
			set( key, value ) {
				if ( typeof key === 'object' ) {
					Object.keys( key ).forEach( ( k ) => messages.set( k, key[ k ] ) );
				} else {
					messages.set( key, value );
				}
			},
			get: ( key ) => messages.get( key )
		},
		message: ( key, ...params ) => ( {
			exists: () => messages.has( key ),
			text: () => ( messages.has( key ) ? format( messages.get( key ), params ) : '⧼' + key + '⧽' )
		} ),
		msg: ( key, ...params ) => ( messages.has( key ) ? format( messages.get( key ), params ) : key ),
		log: { warn: vi.fn(), error: vi.fn() },
		notify: vi.fn(),
		Title,
		util: {
			getUrl: ( title, params ) => '/wiki/' + encodeURIComponent( String( title ).replace( / /g, '_' ) ) +
				( params ? '?' + new URLSearchParams( params ) : '' ),
			wikiScript: () => '/w/api.php'
		},
		storage: {
			getObject: ( key ) => ( storage.has( key ) ? JSON.parse( storage.get( key ) ) : null ),
			setObject: ( key, value ) => storage.set( key, JSON.stringify( value ) ),
			remove: ( key ) => storage.delete( key )
		},
		language: {
			convertNumber: ( n ) => String( n ),
			bcp47: ( lang ) => lang,
			getFallbackLanguageChain: () => [ 'en' ]
		},
		user: { getRights: () => Promise.resolve( [ 'read', 'edit' ] ) },
		hook: () => ( { add: vi.fn(), fire: vi.fn() } )
	};
}

global.mw = createMw();
// jsdom has no layout
Element.prototype.scrollIntoView = () => {};

beforeEach( () => {
	global.mw = createMw();
	mw.messages.set( en );
	[
		[ 'wgWikiID', 'testwiki' ],
		[ 'wgUserLanguage', 'en' ],
		[ 'wgPageName', 'Main_Page' ],
		[ 'wgNamespaceNumber', 0 ],
		[ 'wgArticleId', 1 ],
		[ 'wgRevisionId', 10 ],
		[ 'wgAction', 'view' ],
		[ 'wgIsArticle', true ],
		[ 'wgIsProbablyEditable', true ],
		[ 'wgScriptPath', '/w' ],
		[ 'skin', 'vector-2022' ],
		[ 'wgFormattedNamespaces', NS_NAMES ]
	].forEach( ( [ k, v ] ) => mw.config.set( k, v ) );
	global.fetch = vi.fn( () => Promise.reject( new Error( 'unexpected fetch' ) ) );
} );

/**
 * Route fetch calls by URL substring.
 *
 * @param {Object} routes Map of substring to JSON body, or to a function returning one
 * @return {Function} The mock
 */
export function mockFetch( routes ) {
	global.fetch = vi.fn( ( url ) => {
		const key = Object.keys( routes ).find( ( k ) => decodeURIComponent( url ).includes( k ) );
		if ( !key ) {
			return Promise.reject( new Error( 'no route for ' + url ) );
		}
		const body = typeof routes[ key ] === 'function' ? routes[ key ]( url ) : routes[ key ];
		if ( body instanceof Error ) {
			return Promise.resolve( { ok: false, status: 404, json: () => Promise.resolve( {} ) } );
		}
		return Promise.resolve( { ok: true, status: 200, json: () => Promise.resolve( body ) } );
	} );
	return global.fetch;
}

export const siteinfo = {
	query: {
		extensions: [ { name: 'CirrusSearch' } ],
		namespaces: {
			0: { id: 0, name: '', content: true },
			2: { id: 2, name: 'User' }
		},
		specialpagealiases: [
			{ realname: 'Recentchanges', aliases: [ 'RecentChanges' ] },
			{ realname: 'Randompage', aliases: [ 'Random', 'RandomPage' ] }
		]
	}
};
