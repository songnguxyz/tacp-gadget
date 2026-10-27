import { describe, it, expect } from 'vitest';
import { mockFetch, siteinfo } from './setup.js';
import nsMode from '../src/core/modes/ns.js';
import actionMode from '../src/core/modes/action.js';
import userMode from '../src/core/modes/user.js';
import categoryMode from '../src/core/modes/category.js';
import historyMode from '../src/core/modes/history.js';
import createHelpMode from '../src/core/modes/help.js';
import { createRegistry, defineMode } from '../src/core/services/registry.js';
import { addRecent, getRecent } from '../src/core/services/recent.js';

const context = { title: 'Main_Page', namespace: 0, articleId: 1 };
const signal = () => new AbortController().signal;
const labels = ( group ) => group.items.map( ( i ) => i.label );

describe( '/ns', () => {
	it( 'lists namespaces, then searches inside the chosen one', async () => {
		const [ group ] = nsMode.getResults( 'us' );
		expect( labels( group ) ).toEqual( [ 'User', 'User talk' ] );

		const fetch = mockFetch( { 'list=prefixsearch': { query: { prefixsearch: [ { title: 'User:Alice' } ] } } } );
		const [ pages ] = await group.items[ 0 ].mode.getResults( 'Ali', context, signal() );
		expect( labels( pages ) ).toEqual( [ 'Alice' ] );
		expect( fetch.mock.calls[ 0 ][ 0 ] ).toContain( 'psnamespace=2' );
	} );

	it( 'lists pages of the namespace for an empty query', async () => {
		mockFetch( { 'list=allpages': { query: { allpages: [ { title: 'User:Bob' } ] } } } );
		const sub = nsMode.getResults( '' )[ 0 ].items.find( ( i ) => i.label === 'User' ).mode;
		const [ pages ] = await sub.getResults( '', context, signal() );
		expect( labels( pages ) ).toEqual( [ 'Bob' ] );
	} );
} );

describe( '/action', () => {
	it( 'reads skin portlets and special pages', async () => {
		document.body.innerHTML = '<ul><li id="ca-edit"><a href="/w/index.php?action=edit"><span>Edit</span></a></li>' +
			'<li id="ca-history"><a href="/w/index.php?action=history" title="Past revisions">History</a></li>' +
			'<li id="t-info"><a href="/w/index.php?action=edit">Edit again</a></li>' +
			'<li id="ca-js"><a href="#">JS only</a></li></ul>';
		mockFetch( { 'meta=siteinfo': siteinfo } );
		const [ page, special ] = await actionMode.getResults( '', context, signal() );
		expect( labels( page ) ).toEqual( [ 'Edit', 'History' ] );
		expect( page.items[ 1 ].description ).toBe( 'Past revisions' );
		expect( special.items.map( ( i ) => i.title ) ).toEqual( [ 'Special:RecentChanges', 'Special:Random' ] );

		const [ filtered, specialFiltered ] = await actionMode.getResults( 'random', context, signal() );
		expect( filtered.items ).toEqual( [] );
		expect( labels( specialFiltered ) ).toEqual( [ 'Random' ] );
	} );
} );

describe( '/user', () => {
	it( 'searches users by normalised prefix with contribution links', async () => {
		const fetch = mockFetch( { 'list=allusers': { query: { allusers: [ { name: 'Alice', editcount: 1 } ] } } } );
		const [ group ] = await userMode.getResults( 'ali', context, signal() );
		expect( fetch.mock.calls[ 0 ][ 0 ] ).toContain( 'auprefix=Ali' );
		expect( group.items[ 0 ] ).toMatchObject( { label: 'Alice', title: 'User:Alice', description: '1 edit' } );
		expect( group.items[ 0 ].actions.map( ( a ) => a.id ) ).toEqual( [ 'contribs', 'talk' ] );
	} );
} );

describe( '/category', () => {
	it( 'lists categories and browses members', async () => {
		mockFetch( {
			'list=allcategories': { query: { allcategories: [ { category: 'Fruit', size: 3 } ] } },
			'list=categorymembers': { query: { categorymembers: [
				{ title: 'Category:Citrus', type: 'subcat' },
				{ title: 'Apple', type: 'page' },
				{ title: 'Banana', type: 'page' }
			] } }
		} );
		const [ group ] = await categoryMode.getResults( 'fr', context, signal() );
		expect( group.items[ 0 ] ).toMatchObject( { label: 'Fruit', description: '3 members' } );

		const [ subcats, pages ] = await group.items[ 0 ].mode.getResults( 'a', context, signal() );
		expect( labels( subcats ) ).toEqual( [ 'Citrus' ] );
		expect( labels( pages ) ).toEqual( [ 'Apple', 'Banana' ] );
		expect( subcats.items[ 0 ].mode ).toBeTruthy();
	} );
} );

describe( '/history', () => {
	it( 'lists revisions with diff links, filtered by user or summary', async () => {
		mockFetch( { 'prop=revisions': { query: { pages: [ { revisions: [
			{ revid: 12, parentid: 11, user: 'Alice', comment: 'typo', timestamp: '2026-10-01T00:00:00Z' },
			{ revid: 11, parentid: 0, user: 'Bob', comment: 'created', timestamp: '2026-09-01T00:00:00Z' }
		] } ] } } } );
		const [ group ] = await historyMode.getResults( 'bob', context, signal() );
		expect( group.items ).toHaveLength( 1 );
		expect( group.items[ 0 ].url ).toContain( 'oldid=11' );
		expect( group.items[ 0 ].actions ).toEqual( [] );

		const [ all ] = await historyMode.getResults( '', context, signal() );
		expect( all.items[ 0 ].actions[ 0 ].url ).toContain( 'diff=12' );
		expect( historyMode.isAvailable( { articleId: 0 } ) ).toBe( false );
	} );
} );

describe( '/help', () => {
	it( 'lists every mode and offers to clear recent items', () => {
		const registry = createRegistry( [] );
		const help = defineMode( createHelpMode( registry ) );
		registry.register( help, true );
		registry.register( defineMode( Object.assign( {}, userMode ) ), true );
		const [ modes, tools ] = help.getResults( '', context );
		expect( modes.items.map( ( i ) => i.badge ) ).toEqual( [ '/help', '/user' ] );

		addRecent( 'X', 0 );
		tools.items[ 0 ].run();
		expect( getRecent() ).toEqual( [] );
		expect( mw.notify ).toHaveBeenCalled();
	} );
} );
