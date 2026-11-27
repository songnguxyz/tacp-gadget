// A wiki without CirrusSearch: its own file, since siteinfo is cached per module
import { describe, it, expect } from 'vitest';
import { mockFetch } from './setup.js';
import { getGroups } from '../src/core/results.js';
import { createRegistry } from '../src/core/services/registry.js';

const context = { title: 'Main_Page', namespace: 0, articleId: 1, isArticle: true, canEdit: true };
const signal = () => new AbortController().signal;
const noCirrus = { query: { extensions: [], specialpagealiases: [] } };

describe( 'title typed in other capitals, without CirrusSearch', () => {
	it( 'adds the page through its redirect', async () => {
		const fetch = mockFetch( {
			'meta=siteinfo': noCirrus,
			'search/title': { pages: [] },
			'generator=allpages': { query: { pages: [
				{ title: 'Passive Blocked', redirect: true }, { title: 'Passive Block', redirect: true }
			] } },
			'redirects=1': { query: { redirects: [ { from: 'Passive Block', to: 'Category:Passive-Blocked Fish' } ] } }
		} );
		const groups = await getGroups( { query: 'passive block', mode: null, context, registry: createRegistry( [] ) }, signal() );
		expect( groups[ 0 ].items[ 0 ] ).toMatchObject( { title: 'Category:Passive-Blocked Fish', redirectFrom: 'Passive Block' } );
		const lookup = decodeURIComponent( fetch.mock.calls.find( ( c ) => c[ 0 ].includes( 'generator=allpages' ) )[ 0 ] );
		expect( lookup ).toContain( 'gapprefix=passive' );
		// The API refuses redirects=1 with this generator
		expect( lookup ).not.toContain( 'redirects' );
	} );

	it( 'puts a page, not only a redirect, first', async () => {
		mockFetch( {
			'meta=siteinfo': noCirrus,
			'search/title': { pages: [ { title: 'Apple' } ] },
			'generator=allpages': { query: { pages: [ { title: 'Apple' }, { title: 'Apple Pie' } ] } }
		} );
		const groups = await getGroups( { query: 'apple pie', mode: null, context, registry: createRegistry( [] ) }, signal() );
		expect( groups[ 0 ].items.map( ( i ) => i.title ) ).toEqual( [ 'Apple Pie', 'Apple' ] );
	} );
} );
