// Checks the built files against the size budget in the specification (§9).
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const KB = 1024;
const budgets = [
	[ [ 'TACP.js', 'TACP.css' ], 4 * KB ],
	[ [ 'TACP-core.js', 'TACP-core.css' ], 60 * KB ]
];

let failed = false;
for ( const [ files, limit ] of budgets ) {
	const size = files.reduce( ( sum, f ) => sum + gzipSync( readFileSync( 'dist/' + f ) ).length, 0 );
	const ok = size <= limit;
	failed = failed || !ok;
	console.log( `${ ok ? 'ok  ' : 'FAIL' } ${ files.join( ' + ' ) }: ${ ( size / KB ).toFixed( 1 ) } KB gzipped (budget ${ limit / KB } KB)` );
}
process.exitCode = failed ? 1 : 0;
