import { describe, it, expect } from 'vitest';
import { mockFetch, siteinfo } from './setup.js';
import nsMode from '../src/core/modes/ns.js';
import actionMode from '../src/core/modes/action.js';
import userMode from '../src/core/modes/user.js';
import categoryMode from '../src/core/modes/category.js';
import historyMode from '../src/core/modes/history.js';
import createHelpMode from '../src/core/modes/help.js';
import sectionMode from '../src/core/modes/section.js';
import langMode from '../src/core/modes/lang.js';
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

describe( '/action menus', () => {
	it( 'groups links by menu, page actions first, gadget menus included', () => {
		document.body.innerHTML =
			'<div id="p-navigation" class="mw-portlet"><h3>Navigation</h3><ul><li id="n-mainpage"><a href="/wiki/Main">Main page</a></li></ul></div>' +
			'<div id="p-views" class="mw-portlet"><ul><li id="ca-edit"><a href="/w/index.php?action=edit">Edit</a></li></ul></div>' +
			'<div id="p-twinkle" class="mw-portlet"><div class="vector-menu-heading">TW</div><ul><li id="tw-warn"><a href="/w/x?tw=warn" title="Warn user">Warn</a></li></ul></div>' +
			'<div id="p-lang" class="mw-portlet"><ul><li class="interlanguage-link"><a href="https://en.example/A">English</a></li></ul></div>';
		return actionMode.getResults( '', context, signal() ).then( ( groups ) => {
			expect( groups.map( ( g ) => g.label ) ).toEqual( [ 'This page', 'Navigation', 'TW', 'Special pages' ] );
			expect( labels( groups[ 2 ] ) ).toEqual( [ 'Warn' ] );
		} );
	} );

	it( 'finds a gadget item by its menu name', async () => {
		const groups = await actionMode.getResults( 'tw', context, signal() );
		expect( groups.find( ( g ) => g.label === 'TW' ).items ).toHaveLength( 1 );
	} );
} );

describe( '/section', () => {
	it( 'numbers headings like the TOC, in both heading markups, with DiscussionTools metadata', () => {
		document.body.innerHTML = '<div id="mw-content-text"><div class="mw-parser-output">' +
			'<div class="mw-heading mw-heading2"><h2 id="History">History</h2><span class="mw-editsection">[edit]</span>' +
			'<div class="ext-discussiontools-init-section-metadata">3 comments</div></div>' +
			'<div class="mw-heading mw-heading4"><h4 id="Early_days">Early days</h4></div>' +
			'<h3><span class="mw-headline" id="Later">Later</span><span class="mw-editsection">[edit]</span></h3>' +
			'<h2><span class="mw-headline" id="Sources">Sources</span></h2>' +
			'</div></div>';
		expect( sectionMode.isAvailable() ).toBe( true );
		const [ group ] = sectionMode.getResults( '' );
		expect( group.items.map( ( i ) => [ i.badge, i.label ] ) ).toEqual( [
			[ '1', 'History' ], [ '1.1', 'Early days' ], [ '1.2', 'Later' ], [ '2', 'Sources' ]
		] );
		expect( group.items[ 0 ] ).toMatchObject( { description: '3 comments', url: '#History' } );
		expect( labels( sectionMode.getResults( 'comments' )[ 0 ] ) ).toEqual( [ 'History' ] );
	} );

	it( 'is unavailable on pages without headings', () => {
		document.body.innerHTML = '<div id="mw-content-text"><p>Short page</p></div>';
		expect( sectionMode.isAvailable() ).toBe( false );
	} );
} );

describe( '/lang', () => {
	it( 'reads interlanguage links from the page', async () => {
		document.body.innerHTML = '<ul><li class="interlanguage-link"><a href="https://en.example/wiki/Apple" hreflang="en" title="Apple – English">English</a></li>' +
			'<li class="interlanguage-link"><a href="https://fr.example/wiki/Pomme" hreflang="fr" title="Pomme – French">Français</a></li></ul>';
		const [ group ] = await langMode.getResults( 'fr', context, signal() );
		expect( group.items ).toEqual( [ expect.objectContaining( { label: 'Français', badge: 'fr', url: 'https://fr.example/wiki/Pomme' } ) ] );
	} );

	it( 'asks the API when the skin renders no language links', async () => {
		document.body.innerHTML = '';
		mockFetch( { 'prop=langlinks': { query: { pages: [ { langlinks: [
			{ lang: 'ja', title: 'りんご', url: 'https://ja.example/wiki/りんご', langname: 'Japanese', autonym: '日本語' }
		] } ] } } } );
		const [ group ] = await langMode.getResults( '', context, signal() );
		expect( group.items[ 0 ] ).toMatchObject( { label: '日本語', badge: 'ja', description: 'りんご – Japanese' } );
		expect( langMode.isAvailable( { articleId: 0 } ) ).toBe( false );
	} );
} );
