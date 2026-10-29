import { describe, it, expect } from 'vitest';
import { parseTrigger } from '../src/core/input.js';
import { highlight, matches, text } from '../src/core/text.js';
import { shortcutFor, isEditable, takeoverTarget } from '../src/loader/shortcuts.js';
import { normalizeConfig } from '../src/shared/config.js';
import { loadMessages } from '../src/shared/messages.js';

describe( 'parseTrigger', () => {
	const modes = [ { trigger: '/user' }, { trigger: '/ns' } ];

	it( 'enters a mode once the trigger is followed by a space', () => {
		expect( parseTrigger( '/user', modes ) ).toBe( null );
		expect( parseTrigger( '/user ', modes ) ).toEqual( { mode: modes[ 0 ], rest: '' } );
		expect( parseTrigger( '/USER Ali ce', modes ) ).toEqual( { mode: modes[ 0 ], rest: 'Ali ce' } );
	} );

	it( 'enters a mode at once from a one-character alias', () => {
		const withAliases = modes.concat( { id: 'tacp-section', trigger: '/section' }, { id: 'tacp-lang', trigger: '/lang' } );
		expect( parseTrigger( '#hist', withAliases ) ).toEqual( { mode: withAliases[ 2 ], rest: 'hist' } );
		expect( parseTrigger( '@', withAliases ) ).toEqual( { mode: withAliases[ 3 ], rest: '' } );
		// No alias when the mode is unavailable on this page
		expect( parseTrigger( '#x', modes ) ).toBe( null );
	} );

	it( 'turns a namespace name and colon into a namespace search', () => {
		const withNs = modes.concat( { id: 'tacp-ns', trigger: '/ns' } );
		for ( const typed of [ 'Template:Info box', 'template:Info box', 'TPL:Info box', ' User talk :Info box' ] ) {
			const parsed = parseTrigger( typed, withNs );
			expect( parsed.rest ).toBe( 'Info box' );
		}
		expect( parseTrigger( 'User talk:', withNs ).mode ).toMatchObject( { id: 'tacp-ns-3', label: 'User talk' } );
		// Not a namespace, the main namespace, special pages, or /ns hidden by the wiki
		expect( parseTrigger( 'Star Wars: A New Hope', withNs ) ).toBe( null );
		expect( parseTrigger( ':Apple', withNs ) ).toBe( null );
		expect( parseTrigger( 'Special:Random', withNs ) ).toBe( null );
		expect( parseTrigger( 'Template:X', modes ) ).toBe( null );
	} );

	it( 'ignores unknown triggers and plain text', () => {
		expect( parseTrigger( '/nope x', modes ) ).toBe( null );
		expect( parseTrigger( 'user x', modes ) ).toBe( null );
	} );
} );

describe( 'text helpers', () => {
	it( 'splits the first case-insensitive match', () => {
		expect( highlight( 'Main Page', 'page' ) ).toEqual( [
			{ text: 'Main ', match: false },
			{ text: 'Page', match: true }
		] );
		expect( highlight( 'Main Page', '' ) ).toEqual( [ { text: 'Main Page', match: false } ] );
		expect( highlight( 'Main Page', 'zzz' ) ).toEqual( [ { text: 'Main Page', match: false } ] );
	} );

	it( 'matches case-insensitively', () => {
		expect( matches( 'Recent changes', 'CHANGES ' ) ).toBe( true );
		expect( matches( 'Recent changes', 'edit' ) ).toBe( false );
	} );

	it( 'resolves message keys or keeps plain strings', () => {
		expect( text( 'tacp-close' ) ).toBe( 'Close' );
		expect( text( 'Purge this page' ) ).toBe( 'Purge this page' );
		expect( text( undefined ) ).toBe( '' );
	} );
} );

describe( 'shortcuts', () => {
	const key = ( props ) => Object.assign( {
		key: '', code: '', ctrlKey: false, metaKey: false, altKey: false, shiftKey: false,
		repeat: false, isComposing: false, defaultPrevented: false, target: document.body
	}, props );

	it( 'toggles on Ctrl+K and Cmd+K, by code or key', () => {
		expect( shortcutFor( key( { key: 'k', code: 'KeyK', ctrlKey: true } ), true ) ).toBe( 'toggle' );
		expect( shortcutFor( key( { key: 'k', code: 'KeyK', metaKey: true } ), true ) ).toBe( 'toggle' );
		// Russian layout: key is Cyrillic, code still KeyK
		expect( shortcutFor( key( { key: 'л', code: 'KeyK', ctrlKey: true } ), true ) ).toBe( 'toggle' );
		expect( shortcutFor( key( { key: 'k', code: 'KeyK' } ), true ) ).toBe( null );
		expect( shortcutFor( key( { key: 'K', code: 'KeyK', ctrlKey: true, shiftKey: true } ), true ) ).toBe( null );
	} );

	it( 'opens on / only outside editable elements', () => {
		const input = document.createElement( 'input' );
		const editable = document.createElement( 'div' );
		editable.setAttribute( 'contenteditable', 'true' );
		const inner = document.createElement( 'span' );
		editable.appendChild( inner );
		expect( shortcutFor( key( { key: '/', code: 'Slash' } ), true ) ).toBe( 'open' );
		expect( shortcutFor( key( { key: '/', code: 'Digit7', shiftKey: true } ), true ) ).toBe( 'open' );
		expect( shortcutFor( key( { key: '/', code: 'Slash', target: input } ), true ) ).toBe( null );
		expect( shortcutFor( key( { key: '/', code: 'Slash', target: inner } ), true ) ).toBe( null );
		expect( shortcutFor( key( { key: '/', code: 'Slash' } ), false ) ).toBe( null );
		expect( shortcutFor( key( { key: '?', code: 'Slash', shiftKey: true } ), true ) ).toBe( null );
		expect( isEditable( null ) ).toBe( false );
	} );

	it( 'ignores repeats, composition and keys an editor already handled', () => {
		const ctrlK = { key: 'k', code: 'KeyK', ctrlKey: true };
		expect( shortcutFor( key( Object.assign( { repeat: true }, ctrlK ) ), true ) ).toBe( null );
		expect( shortcutFor( key( Object.assign( { isComposing: true }, ctrlK ) ), true ) ).toBe( null );
		expect( shortcutFor( key( Object.assign( { defaultPrevented: true }, ctrlK ) ), true ) ).toBe( null );
	} );
} );

describe( 'config and messages', () => {
	it( 'applies defaults and drops unknown or invalid settings', () => {
		const c = normalizeConfig( { prefetch: true, slashShortcut: 'no', colour: 1 } );
		expect( c.prefetch ).toBe( true );
		expect( c.slashShortcut ).toBe( true );
		expect( c.colour ).toBeUndefined();
		expect( mw.log.warn ).toHaveBeenCalledTimes( 2 );
		expect( normalizeConfig( null ).disabledModes ).toEqual( [] );
	} );

	it( 'lets overrides in the fallback chain beat bundled messages, tacp- keys only', () => {
		loadMessages(
			{ en: { 'tacp-a': 'A', 'tacp-b': 'B' }, vi: { 'tacp-a': 'Á' } },
			{ en: { 'tacp-b': 'B!', edit: 'hijacked' } },
			[ 'vi', 'en' ]
		);
		expect( mw.messages.get( 'tacp-a' ) ).toBe( 'Á' );
		expect( mw.messages.get( 'tacp-b' ) ).toBe( 'B!' );
		expect( mw.messages.get( 'edit' ) ).toBeUndefined();
	} );
} );

describe( 'search takeover', () => {
	it( 'targets the skin search box and search buttons only', () => {
		document.body.innerHTML = '<form><input id="searchInput"><input id="other"></form>' +
			'<a id="searchIcon" href="/wiki/Special:Search"><span class="icon"></span></a>' +
			'<a class="search-toggle" href="#">Search</a>' +
			'<div class="vector-search-box"><input type="search" name="search"></div>' +
			'<form id="search"><input id="searchText" name="search"></form>';
		const box = document.getElementById( 'searchInput' );
		const icon = document.getElementById( 'searchIcon' );
		const ev = ( type, target ) => ( { type, target } );
		expect( takeoverTarget( ev( 'focus', box ) ) ).toBe( box );
		expect( takeoverTarget( ev( 'mousedown', box ) ) ).toBe( box );
		expect( takeoverTarget( ev( 'click', icon.firstChild ) ) ).toBe( icon );
		expect( takeoverTarget( ev( 'click', document.querySelector( '.search-toggle' ) ) ) ).not.toBe( null );
		// Focus on a button is not a reason to open; only the box is
		expect( takeoverTarget( ev( 'focus', icon ) ) ).toBe( null );
		expect( takeoverTarget( ev( 'focus', document.getElementById( 'other' ) ) ) ).toBe( null );
		expect( takeoverTarget( ev( 'click', document ) ) ).toBe( null );
		// Vector 2022's sticky header box, but never Special:Search's own form
		const sticky = document.querySelector( '.vector-search-box input' );
		expect( takeoverTarget( ev( 'focus', sticky ) ) ).toBe( sticky );
		expect( takeoverTarget( ev( 'focus', document.getElementById( 'searchText' ) ) ) ).toBe( null );
	} );
} );
