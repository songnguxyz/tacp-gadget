// Checks the built files against the size budget in the specification (§9),
// and that their syntax is no newer than the build target (scripts/build.js).
import { readFileSync, readdirSync } from 'node:fs';
import { parse } from 'acorn';
import { gzipSync } from 'node:zlib';

const KB = 1024;
const budgets = [
	// Both loaders carry the loader messages of every language in i18n/
	[ [ 'TACP.js', 'TACP.css' ], 6 * KB ],
	// Loaded on every page too, minified, with both stylesheet directions inline
	[ [ 'TACP-user.js' ], 6 * KB ],
	[ [ 'TACP-core.js', 'TACP-core.css' ], 60 * KB ]
];

let failed = false;
for ( const [ files, limit ] of budgets ) {
	const size = files.reduce( ( sum, f ) => sum + gzipSync( readFileSync( 'dist/' + f ) ).length, 0 );
	const ok = size <= limit;
	failed = failed || !ok;
	console.log( `${ ok ? 'ok  ' : 'FAIL' } ${ files.join( ' + ' ) }: ${ ( size / KB ).toFixed( 1 ) } KB gzipped (budget ${ limit / KB } KB)` );
}
for ( const f of readdirSync( 'dist' ).filter( ( name ) => name.endsWith( '.js' ) ) ) {
	try {
		parse( readFileSync( 'dist/' + f, 'utf8' ), { ecmaVersion: 2018 } );
	} catch ( e ) {
		failed = true;
		console.log( `FAIL ${ f }: not ES2018 (${ e.message })` );
	}
}
process.exitCode = failed ? 1 : 0;
