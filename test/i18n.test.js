import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { readMessages } from '../scripts/messages.js';

const keys = ( messages ) => Object.keys( messages ).filter( ( k ) => k !== '@metadata' ).sort();
const params = ( text ) => text.match( /\$\d+/g ) || [];

describe( 'message files', () => {
	const all = readMessages();
	const qqq = JSON.parse( readFileSync( 'i18n/qqq.json', 'utf8' ) );

	// translatewiki.net asks for documentation of every message
	it( 'documents every English message in qqq.json, and nothing else', () => {
		expect( keys( qqq ) ).toEqual( keys( all.en ) );
	} );

	// A translation may drop a parameter (Vietnamese has no plural, so no $2), never add one
	it( 'has no translated message or parameter that English lacks', () => {
		for ( const [ lang, messages ] of Object.entries( all ) ) {
			for ( const key of keys( messages ) ) {
				expect( all.en, `${ lang }: ${ key }` ).toHaveProperty( key );
				const extra = params( messages[ key ] ).filter( ( p ) => !params( all.en[ key ] ).includes( p ) );
				expect( extra, `${ lang }: ${ key }` ).toEqual( [] );
			}
		}
	} );
} );
