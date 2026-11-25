// Screenshots for the manual test matrix; run through e2e/matrix.sh.
// Usage: node e2e/matrix.js <out dir> <label>=<port>...
import { chromium, devices } from 'playwright';
import { mkdirSync, readFileSync } from 'node:fs';

const [ out, ...wikis ] = process.argv.slice( 2 );
const CASES = [
	[ 'vector-2022', 'Vector 2022', {} ],
	[ 'vector-2022', 'Vector 2022 (night)', { night: true } ],
	[ 'vector', 'Vector legacy', {} ],
	[ 'monobook', 'MonoBook', {} ],
	[ 'timeless', 'Timeless', {} ],
	[ 'minerva', 'Minerva (phone)', { phone: true } ],
	[ 'citizen', 'Citizen (must exit)', { exits: true } ],
	[ 'vector-2022', 'JavaScript disabled', { noJs: true } ]
];

// Returns a note on what was seen; throws when the case fails
async function check( page, opts ) {
	if ( opts.noJs ) {
		const tacp = await page.locator( '[class*="tacp-"]' ).count();
		if ( tacp || !await page.locator( 'input[name="search"]' ).count() ) {
			throw new Error( `${ tacp } TACP elements, or no skin search box` );
		}
		return 'no TACP elements, skin search box present';
	}
	if ( opts.exits ) {
		// The loader sets tacpRunning before it sees the skin, so look for its output instead
		await page.waitForTimeout( 2500 );
		await page.keyboard.press( 'Control+k' );
		await page.waitForTimeout( 800 );
		if ( await page.locator( '.tacp-palette, .tacp-mobile-button' ).count() ) {
			throw new Error( 'TACP opened on Citizen' );
		}
		return 'TACP did not start';
	}
	if ( opts.night ) {
		await page.evaluate( () => {
			const html = document.documentElement;
			html.className = html.className.replace( /skin-theme-clientpref-\w+/g, '' ) + ' skin-theme-clientpref-night';
		} );
	}
	await page.waitForFunction( () => window.tacpRunning, null, { timeout: 15000 } );
	if ( opts.phone ) {
		await page.locator( '.tacp-mobile-button' ).click();
	} else {
		await page.keyboard.press( 'Control+k' );
	}
	await page.getByRole( 'combobox' ).first().fill( 'Apple' );
	await page.getByRole( 'option', { name: /pie/ } ).waitFor( { timeout: 15000 } );
	await page.waitForTimeout( 400 );
	return 'palette opened with results';
}

mkdirSync( out, { recursive: true } );
const browser = await chromium.launch();
let failed = 0;
for ( const wiki of wikis ) {
	const [ label, port ] = wiki.split( '=' );
	const cells = [];
	for ( const [ i, [ skin, name, opts ] ] of CASES.entries() ) {
		const context = await browser.newContext( Object.assign(
			opts.phone ? Object.assign( {}, devices[ 'Pixel 5' ] ) : { viewport: { width: 1100, height: 800 } },
			{ javaScriptEnabled: !opts.noJs }
		) );
		const page = await context.newPage();
		const errors = [];
		page.on( 'pageerror', ( e ) => errors.push( e.message ) );
		let result;
		try {
			await page.goto( `http://127.0.0.1:${ port }/index.php?title=Apple&useskin=${ skin }&uselang=vi` );
			result = 'ok    ' + await check( page, opts );
		} catch ( e ) {
			failed++;
			result = 'FAIL  ' + e.message.split( '\n' )[ 0 ];
		}
		if ( errors.length ) {
			failed++;
			result += ' | page errors: ' + errors.join( '; ' );
		}
		console.log( `${ label } ${ name }: ${ result }` );
		const file = `${ out }/${ label }-${ i }.png`;
		await page.screenshot( { path: file } );
		cells.push( `<figure><img src="data:image/png;base64,${ readFileSync( file ).toString( 'base64' ) }"><figcaption>${ name }</figcaption></figure>` );
		await context.close();
	}
	const sheet = await browser.newPage( { viewport: { width: 1600, height: 900 } } );
	await sheet.setContent( `<style>body{margin:0;padding:12px;font:15px system-ui}h1{font-size:18px;margin:0 0 8px}div{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;align-items:start}figure{margin:0}img{width:100%;max-height:420px;object-fit:contain;object-position:top;border:1px solid #ccc;display:block}</style><h1>MediaWiki ${ label }</h1><div>${ cells.join( '' ) }</div>` );
	await sheet.screenshot( { path: `${ out }/sheet-${ label }.png`, fullPage: true } );
	await sheet.close();
}
await browser.close();
process.exitCode = failed ? 1 : 0;
