/* eslint-disable camelcase -- REST API field names */
import { describe, it, expect } from 'vitest';
import { mockFetch, siteinfo } from './setup.js';
import { searchTitles } from '../src/core/providers/search.js';
import { getRelated } from '../src/core/providers/related.js';
import { getGroups, normalizeGroups } from '../src/core/results.js';
import { createRegistry, defineMode } from '../src/core/services/registry.js';
import { builtinCommands } from '../src/core/providers/commands.js';
import { addRecent, getRecent, clearRecent } from '../src/core/services/recent.js';
import icons from '../src/core/icons.js';

const context = Object.freeze( {
	title: 'Main_Page', namespace: 0, articleId: 1, isArticle: true, canEdit: true
} );

function registry() {
	const r = createRegistry( [] );
	r.register( defineMode( { id: 'tacp-user', trigger: '/user', label: 'tacp-mode-user', description: 'tacp-mode-user-desc', getResults: () => [] } ), true );
	builtinCommands.forEach( ( c ) => r.register( c, true ) );
	return r;
}

const restPages = {
	pages: [
		{ title: 'Apple', description: 'A fruit', thumbnail: { url: '//img/apple.jpg' }, matched_title: null },
		{ title: 'User:Apple', description: null, thumbnail: null, matched_title: 'Apples' }
	]
};

describe( 'search provider', () => {
	it( 'maps REST results to page items', async () => {
		mockFetch( { '/rest.php/v1/search/title': restPages } );
		const items = await searchTitles( 'app', new AbortController().signal );
		expect( items[ 0 ] ).toMatchObject( { label: 'Apple', description: 'A fruit', thumbnail: { url: '//img/apple.jpg' }, badge: '' } );
		expect( items[ 1 ] ).toMatchObject( { label: 'Apple', badge: 'User', redirectFrom: 'Apples', title: 'User:Apple' } );
		expect( items[ 0 ].actions.map( ( a ) => a.id ) ).toEqual( [ 'edit', 'history', 'copy' ] );
	} );

	it( 'falls back to opensearch when rest.php fails', async () => {
		mockFetch( {
			'/rest.php/': new Error( '404' ),
			'action=opensearch': [ 'app', [ 'Apple' ], [ 'A fruit' ], [] ]
		} );
		const items = await searchTitles( 'app', new AbortController().signal );
		expect( items.map( ( i ) => i.label ) ).toEqual( [ 'Apple' ] );
	} );
} );

describe( 'related provider', () => {
	it( 'uses CirrusSearch morelike: on content pages', async () => {
		const fetch = mockFetch( {
			'meta=siteinfo': siteinfo,
			'morelike:Main_Page': { query: { pages: [ { title: 'B', index: 2 }, { title: 'A', index: 1, description: 'first' } ] } }
		} );
		const items = await getRelated( context, new AbortController().signal );
		expect( items.map( ( i ) => i.label ) ).toEqual( [ 'A', 'B' ] );
		expect( fetch ).toHaveBeenCalledTimes( 2 );
	} );

	it( 'shows nothing outside content pages', async () => {
		expect( await getRelated( Object.assign( {}, context, { isArticle: false } ) ) ).toEqual( [] );
		mockFetch( { 'meta=siteinfo': siteinfo } );
		expect( await getRelated( Object.assign( {}, context, { namespace: 2 } ) ) ).toEqual( [] );
	} );
} );

describe( 'recent items', () => {
	it( 'keeps newest first without duplicates, up to 20', () => {
		for ( let i = 0; i < 25; i++ ) {
			addRecent( 'Page ' + i, 0 );
		}
		addRecent( 'Page 3', 0 );
		const list = getRecent();
		expect( list ).toHaveLength( 20 );
		expect( list[ 0 ].title ).toBe( 'Page 3' );
		expect( list.filter( ( e ) => e.title === 'Page 3' ) ).toHaveLength( 1 );
		clearRecent();
		expect( getRecent() ).toEqual( [] );
	} );

	it( 'is empty when storage throws', () => {
		mw.storage.getObject = () => {
			throw new Error( 'denied' );
		};
		expect( getRecent() ).toEqual( [] );
	} );
} );

describe( 'getGroups', () => {
	const signal = () => new AbortController().signal;

	it( 'shows recent, related and suggested commands for an empty query', async () => {
		mockFetch( { 'meta=siteinfo': siteinfo, morelike: { query: { pages: [ { title: 'Rel', index: 1 } ] } } } );
		addRecent( 'Seen', 0 );
		const groups = await getGroups( { query: '', mode: null, context, registry: registry() }, signal() );
		expect( groups.map( ( g ) => g.label ) ).toEqual( [ 'Recent', 'Related', 'Commands' ] );
		expect( groups[ 2 ].items.map( ( i ) => i.label ) ).toEqual( [ 'Edit this page', 'View history', 'Random page', 'Discussion' ] );
	} );

	it( 'shows results, matching commands and query actions while typing', async () => {
		// REST was marked broken by the fallback test above, so opensearch answers
		mockFetch( { 'action=opensearch': [ 'random', [ 'Random walk' ], [ '' ], [] ] } );
		const groups = await getGroups( { query: 'random', mode: null, context, registry: registry() }, signal() );
		expect( groups.map( ( g ) => g.label ) ).toEqual( [ 'Results', 'Commands', 'More' ] );
		expect( groups[ 1 ].items.map( ( i ) => i.label ) ).toEqual( [ 'Random page' ] );
		expect( groups[ 2 ].items.map( ( i ) => i.label ) ).toEqual( [
			'Go to "Random"', 'Search full text for "random"', 'Create or edit "Random"'
		] );
	} );

	it( 'lists modes for a query starting with /', async () => {
		const groups = await getGroups( { query: '/us', mode: null, context, registry: registry() }, signal() );
		expect( groups[ 0 ].items[ 0 ] ).toMatchObject( { label: 'Users', badge: '/user' } );
		expect( groups[ 0 ].items[ 0 ].mode.id ).toBe( 'tacp-user' );
	} );

	it( 'asks the active mode and keeps only safe output', async () => {
		const mode = { id: 'x-mode', getResults: ( q ) => [ {
			label: 'G',
			items: [
				// eslint-disable-next-line no-script-url -- must be dropped
				{ label: '<b>' + q + '</b>', url: 'javascript:alert(1)', icon: '<path d="M0"/>', actions: [ { label: 'bad', url: 'data:text/html,x' } ] },
				{ label: 'named', icon: 'reload', actions: [ { label: 'ok', url: '/wiki/X', icon: icons.edit } ] },
				null
			]
		} ] };
		const groups = await getGroups( { query: 'q', mode, context, registry: registry() }, signal() );
		expect( groups[ 0 ].items ).toHaveLength( 2 );
		expect( groups[ 0 ].items[ 0 ] ).toMatchObject( { label: '<b>q</b>', url: null, icon: undefined, actions: [] } );
		expect( groups[ 0 ].items[ 1 ].icon ).toBe( icons.reload );
		expect( groups[ 0 ].items[ 1 ].actions[ 0 ] ).toMatchObject( { icon: icons.edit, url: 'http://localhost:3000/wiki/X' } );
	} );

	it( 'drops empty groups and garbage', () => {
		expect( normalizeGroups( 'nope', 'x' ) ).toEqual( [] );
		expect( normalizeGroups( [ { label: 'Empty', items: [] } ], 'x' ) ).toEqual( [] );
	} );
} );
