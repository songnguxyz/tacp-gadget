// End-to-end tests against a real MediaWiki prepared by e2e/setup-wiki.sh.
// Run: MW_DIR=<mediawiki-dir> npm run e2e (MW_SERVER defaults to http://127.0.0.1:8080)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { chromium, devices } from 'playwright';

const SERVER = process.env.MW_SERVER || 'http://127.0.0.1:8080';
const url = ( title, params ) => SERVER + '/index.php?' + new URLSearchParams( Object.assign( { title }, params ) );

let browser;
before( async () => {
	browser = await chromium.launch();
} );
after( () => browser.close() );

/**
 * A page on the wiki; fails the test on any uncaught script error.
 *
 * @param {string} title
 * @param {Object} params Query parameters, e.g. useskin
 * @param {Object} [options] Browser context options
 * @return {Promise<Object>} Playwright page
 */
async function visit( title, params, options ) {
	const context = await browser.newContext( options );
	const page = await context.newPage();
	page.errors = [];
	page.on( 'pageerror', ( e ) => page.errors.push( e.message ) );
	await page.goto( url( title, params ) );
	// The loader gadget is in place once its module is ready
	await page.waitForFunction( () => mw.loader.getState( 'ext.gadget.TACP' ) === 'ready' );
	return page;
}

async function done( page ) {
	assert.deepEqual( page.errors, [] );
	await page.context().close();
}

const palette = ( page ) => page.getByRole( 'dialog' ).getByRole( 'combobox' );

function edit( title, text ) {
	execFileSync( 'php', [ process.env.MW_DIR + '/maintenance/run.php', 'edit', title ], { input: text } );
}

function setConfig( config ) {
	edit( 'MediaWiki:Gadget-TACP-config.json', JSON.stringify( config ) );
}

test( 'Vector 2022: Ctrl+K, search, Enter goes to the exact title', async () => {
	const page = await visit( 'Main_Page', { useskin: 'vector-2022' }, { viewport: { width: 1280, height: 800 } } );
	await page.keyboard.press( 'Control+k' );
	await palette( page ).fill( 'apple' );
	const options = page.getByRole( 'option' );
	await options.filter( { hasText: 'Apple pie' } ).waitFor();
	assert.match( await options.first().innerText(), /^Apple\b(?! pie)/ );
	await Promise.all( [ page.waitForURL( /Apple$/ ), palette( page ).press( 'Enter' ) ] );
	await done( page );
} );

test( 'keys typed while the core loads reach the palette', async () => {
	const page = await visit( 'Main_Page', { useskin: 'vector-2022' } );
	// Make the first load slow enough to type into
	await page.route( /TACP-core/, async ( route ) => {
		await new Promise( ( resolve ) => {
			setTimeout( resolve, 1000 );
		} );
		await route.continue();
	} );
	await page.keyboard.press( 'Control+k' );
	await page.keyboard.type( 'applx' );
	await page.keyboard.press( 'Backspace' );
	await page.keyboard.type( 'e' );
	await page.waitForFunction( () => {
		const input = document.querySelector( '.tacp-input' );
		return !!input && input.value === 'apple';
	}, null, { timeout: 5000 } );
	await done( page );
} );

test( 'preferences description is deployed in Vietnamese', async () => {
	const describe = async ( lang ) => {
		const res = await fetch( SERVER + '/api.php?' + new URLSearchParams( {
			action: 'parse', format: 'json', formatversion: 2, prop: 'text', contentmodel: 'wikitext',
			uselang: lang, text: '{{int:Gadget-TACP}}'
		} ) );
		return ( await res.json() ).parse.text;
	};
	assert.match( await describe( 'vi' ), /Bảng lệnh TACP/ );
} );

test( '/ opens, Escape closes', async () => {
	const page = await visit( 'Main_Page', { useskin: 'vector-2022' } );
	await page.keyboard.press( '/' );
	await palette( page ).waitFor();
	await page.keyboard.press( 'Escape' );
	await page.getByRole( 'dialog' ).waitFor( { state: 'hidden' } );
	await done( page );
} );

test( '# lists the headings and jumps to one', async () => {
	const page = await visit( 'Apple', { useskin: 'vector-2022' } );
	await page.keyboard.press( 'Control+k' );
	await palette( page ).fill( '#' );
	await page.getByRole( 'option', { name: /Green/ } ).waitFor();
	assert.equal( await page.getByRole( 'option' ).count(), 3 );
	// '#' entered the mode and cleared the input
	await palette( page ).fill( 'hist' );
	// Only History is left once the filter applied
	await page.getByRole( 'option', { name: /Varieties/ } ).waitFor( { state: 'detached' } );
	await palette( page ).press( 'Enter' );
	// Same-document navigation: no load event to wait for
	await page.waitForFunction( () => location.hash === '#History' );
	await done( page );
} );

test( 'a namespace name and colon becomes a chip', async () => {
	const page = await visit( 'Apple', { useskin: 'vector-2022' } );
	await page.keyboard.press( 'Control+k' );
	await palette( page ).fill( 'talk:Apple' );
	await page.locator( '.tacp-chip', { hasText: 'Talk' } ).waitFor();
	assert.equal( await palette( page ).inputValue(), 'Apple' );
	await page.getByRole( 'option', { name: /Talk:Apple/ } ).first().waitFor();
	// Backspace in the empty input removes the chip
	await palette( page ).fill( '' );
	await palette( page ).press( 'Backspace' );
	await page.locator( '.tacp-chip' ).waitFor( { state: 'detached' } );
	await palette( page ).fill( 'Special:recent' );
	await page.locator( '.tacp-chip', { hasText: 'Special' } ).waitFor();
	await page.getByRole( 'option', { name: /RecentChanges/ } ).first().waitFor();
	await done( page );
} );

test( '@ on a page with no other languages says so', async () => {
	const page = await visit( 'Apple', { useskin: 'vector-2022' } );
	await page.keyboard.press( 'Control+k' );
	await palette( page ).fill( '@' );
	await page.locator( '.tacp-state__title' ).waitFor();
	assert.doesNotMatch( await page.locator( '.tacp-state' ).innerText(), /""|“”/ );
	await done( page );
} );

test( 'Minerva on a phone: the floating button opens the palette', async () => {
	const page = await visit( 'Apple', { useskin: 'minerva' }, devices[ 'Pixel 7' ] );
	await page.getByRole( 'button', { name: /palette|bảng lệnh/i } ).tap();
	await palette( page ).waitFor();
	await done( page );
} );

test( 'search takeover', async ( t ) => {
	setConfig( { searchTakeover: true } );
	t.after( () => setConfig( {} ) );

	await t.test( 'Vector 2022 search box opens the palette', async () => {
		const page = await visit( 'Main_Page', { useskin: 'vector-2022' }, { viewport: { width: 1280, height: 800 } } );
		await page.locator( '.vector-search-box input[name="search"]' ).first().click();
		await palette( page ).waitFor();
		await done( page );
	} );

	await t.test( 'Minerva search button opens the palette, no floating button', async () => {
		const page = await visit( 'Apple', { useskin: 'minerva' }, devices[ 'Pixel 7' ] );
		assert.equal( await page.locator( '.tacp-mobile-button' ).count(), 0 );
		await page.locator( '#searchIcon' ).tap();
		await palette( page ).waitFor();
		await done( page );
	} );
} );

test( 'TACP-cdn.js loaded with mw.loader.load from a CDN, right to left', async ( t ) => {
	edit( 'MediaWiki:Gadgets-definition', '' );
	t.after( () => edit( 'MediaWiki:Gadgets-definition', readFileSync( process.env.MW_DIR + '/tacp-definition.txt', 'utf8' ) ) );
	const context = await browser.newContext();
	// Stands in for cdn.jsdelivr.net/gh/<repo>@<commit>/
	const served = [];
	await context.route( 'https://cdn.test/tacp@abc123/*', ( route ) => {
		const file = new URL( route.request().url() ).pathname.split( '/' ).pop();
		served.push( file );
		route.fulfill( {
			body: readFileSync( new URL( '../dist/' + file, import.meta.url ) ),
			contentType: file.endsWith( '.css' ) ? 'text/css' : 'text/javascript'
		} );
	} );
	const page = await context.newPage();
	page.errors = [];
	page.on( 'pageerror', ( e ) => page.errors.push( e.message ) );
	await page.goto( url( 'Apple', { useskin: 'vector-2022', uselang: 'he' } ) );
	await page.waitForFunction( () => mw.loader.getState( 'mediawiki.base' ) === 'ready' );
	await page.evaluate( () => {
		window.tacpConfig = { slashShortcut: false };
		mw.loader.load( 'https://cdn.test/tacp@abc123/TACP-cdn.js' );
	} );
	await page.waitForFunction( () => window.tacpCdn );
	// Only the loader until the palette opens
	await page.waitForTimeout( 300 );
	assert.deepEqual( served, [ 'TACP-cdn.js' ] );
	// slashShortcut: false from window.tacpConfig
	await page.keyboard.press( '/' );
	await page.waitForTimeout( 300 );
	assert.equal( await page.getByRole( 'dialog' ).count(), 0 );
	await page.keyboard.press( 'Control+k' );
	await palette( page ).fill( 'apple' );
	await page.getByRole( 'option', { name: /Apple pie/ } ).waitFor();
	assert.deepEqual( served.sort(), [ 'TACP-cdn-core.js', 'TACP-cdn-core.rtl.css', 'TACP-cdn.js' ] );
	// The right-to-left stylesheet: the highlight bar is on the right
	const bar = await page.locator( '.tacp-item--active' ).evaluate( ( el ) => getComputedStyle( el ).boxShadow );
	assert.match( bar, / -4px 0px 0px 0px inset$/ );
	// Loading it a second time does not start a second copy
	const warned = page.waitForEvent( 'console', ( m ) => /already running/.test( m.text() ) );
	await page.evaluate( () => mw.loader.load( 'https://cdn.test/tacp@abc123/TACP-cdn.js?again' ) );
	await warned;
	await done( page );
} );
