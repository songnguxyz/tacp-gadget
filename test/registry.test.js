import { describe, it, expect } from 'vitest';
import { createRegistry, defineMode, defineCommand } from '../src/core/services/registry.js';
import { builtinCommands } from '../src/core/providers/commands.js';
import nsMode from '../src/core/modes/ns.js';
import actionMode from '../src/core/modes/action.js';
import userMode from '../src/core/modes/user.js';
import categoryMode from '../src/core/modes/category.js';
import historyMode from '../src/core/modes/history.js';
import createHelpMode from '../src/core/modes/help.js';
import sectionMode from '../src/core/modes/section.js';
import langMode from '../src/core/modes/lang.js';

const mode = ( extra ) => Object.assign( {
	id: 'mygadget-mode',
	trigger: '/mine',
	label: 'Mine',
	description: 'My mode',
	getResults: () => []
}, extra );

const command = ( extra ) => Object.assign( {
	id: 'mygadget-purge',
	label: 'Purge',
	description: 'Purge the page',
	run: () => {}
}, extra );

describe( 'defineMode / defineCommand', () => {
	it( 'normalises a valid mode and defaults the layout', () => {
		const m = defineMode( mode() );
		expect( m.kind ).toBe( 'mode' );
		expect( m.layout ).toBe( 'list' );
		expect( Object.isFrozen( m ) ).toBe( true );
	} );

	it( 'rejects missing required keys', () => {
		expect( defineMode( mode( { getResults: undefined } ) ) ).toBe( null );
		expect( defineCommand( command( { run: 'nope' } ) ) ).toBe( null );
		expect( mw.log.warn ).toHaveBeenCalled();
	} );

	it( 'rejects a trigger without a slash or with spaces', () => {
		expect( defineMode( mode( { trigger: 'mine' } ) ) ).toBe( null );
		expect( defineMode( mode( { trigger: '/my mode' } ) ) ).toBe( null );
	} );

	it( 'warns on unknown keys but still defines', () => {
		const c = defineCommand( command( { colour: 'red' } ) );
		expect( c ).not.toBe( null );
		expect( c.colour ).toBeUndefined();
		expect( mw.log.warn ).toHaveBeenCalledWith( expect.stringContaining( 'colour' ) );
	} );
} );

describe( 'registry', () => {
	it( 'registers modes and commands, built-ins first', () => {
		const r = createRegistry( [] );
		expect( r.register( defineMode( mode() ) ) ).toBe( true );
		expect( r.register( defineMode( mode( { id: 'tacp-ns', trigger: '/ns' } ) ), true ) ).toBe( true );
		expect( r.register( command() ) ).toBe( true );
		expect( r.getModes( {} ).map( ( m ) => m.id ) ).toEqual( [ 'mygadget-mode', 'tacp-ns' ] );
		expect( r.getCommands( {} ) ).toHaveLength( 1 );
	} );

	it( 'reserves the tacp- prefix and built-in triggers for TACP', () => {
		const r = createRegistry( [] );
		expect( r.register( command( { id: 'tacp-x' } ) ) ).toBe( false );
		expect( r.register( mode( { trigger: '/cargo' } ) ) ).toBe( false );
		expect( r.register( mode( { trigger: '/USER' } ) ) ).toBe( false );
	} );

	it( 'lets the first registration of a trigger or id win', () => {
		const r = createRegistry( [] );
		expect( r.register( mode() ) ).toBe( true );
		expect( r.register( mode( { id: 'other-mode' } ) ) ).toBe( false );
		expect( r.register( command( { id: 'mygadget-mode' } ) ) ).toBe( false );
	} );

	it( 'hides disabled modes and unavailable items', () => {
		const r = createRegistry( [ 'mygadget-mode' ] );
		r.register( mode() );
		r.register( mode( { id: 'b-mode', trigger: '/b', isAvailable: ( ctx ) => ctx.ok } ) );
		r.register( command( { isAvailable: () => {
			throw new Error( 'boom' );
		} } ) );
		expect( r.getModes( { ok: false } ) ).toHaveLength( 0 );
		expect( r.getModes( { ok: true } ).map( ( m ) => m.id ) ).toEqual( [ 'b-mode' ] );
		expect( r.getCommands( {} ) ).toHaveLength( 0 );
	} );

	it( 'ignores invalid input', () => {
		const r = createRegistry( [] );
		expect( r.register( null ) ).toBe( false );
		expect( r.register( { id: 'bad-thing' } ) ).toBe( false );
	} );
} );

describe( 'built-ins', () => {
	it( 'all register into one registry without id or trigger clashes', () => {
		const r = createRegistry( [] );
		[ nsMode, actionMode, sectionMode, langMode, userMode, categoryMode, historyMode, createHelpMode( r ) ].forEach( ( spec ) => {
			expect( r.register( defineMode( spec ), true ) ).toBe( true );
		} );
		builtinCommands.forEach( ( cmd ) => expect( r.register( cmd, true ) ).toBe( true ) );
	} );
} );
