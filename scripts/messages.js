// Every i18n/<lang>.json except qqq (message documentation), without @metadata.
// A new language file, by hand or from translatewiki.net, is picked up as is.
import { readFileSync, readdirSync } from 'node:fs';

export function readMessages( dir = 'i18n' ) {
	const all = {};
	for ( const file of readdirSync( dir ) ) {
		const lang = file.replace( /\.json$/, '' );
		if ( lang !== file && lang !== 'qqq' ) {
			all[ lang ] = JSON.parse( readFileSync( `${ dir }/${ file }`, 'utf8' ) );
			delete all[ lang ][ '@metadata' ];
		}
	}
	return all;
}
