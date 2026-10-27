import { describe, it, expect, vi, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { nextTick } from 'vue';
import App from '../src/core/App.vue';
import store from '../src/core/store.js';
import { createRegistry, defineMode } from '../src/core/services/registry.js';

// Longer than the 150 ms search debounce
const tick = () => new Promise( ( resolve ) => {
	setTimeout( resolve, 200 );
} ).then( flushPromises );
let wrapper = null;

function setup() {
	const registry = createRegistry( [] );
	const run = vi.fn();
	registry.register( defineMode( {
		id: 'mygadget-fruit',
		trigger: '/fruit',
		label: 'Fruit',
		description: 'Pick a fruit',
		getResults: ( q ) => [ { label: 'Fruit', items: [
			{ id: 'a', label: 'Apple', run },
			{ id: 'b', label: 'Banana', run }
		].filter( ( i ) => i.label.toLowerCase().includes( q ) ) } ]
	} ) );
	wrapper = mount( App, { props: { registry }, attachTo: document.body } );
	return { run };
}

async function openWith( prefill ) {
	store.prefill = prefill;
	store.open = true;
	await nextTick();
	await tick();
	return document.querySelector( '.tacp-input' );
}

async function type( input, value ) {
	input.value = value;
	input.dispatchEvent( new Event( 'input' ) );
	await tick();
}

function key( input, k, extra ) {
	input.dispatchEvent( new KeyboardEvent( 'keydown', Object.assign( { key: k, bubbles: true }, extra ) ) );
	return tick();
}

afterEach( () => {
	store.open = false;
	wrapper.unmount();
	document.body.innerHTML = '';
} );

describe( 'App', () => {
	it( 'enters a mode from a typed trigger and runs the highlighted item', async () => {
		const { run } = setup();
		const input = await openWith( '/fruit ' );
		expect( document.querySelector( '.tacp-chip__label' ).textContent ).toBe( 'Fruit' );
		expect( input.value ).toBe( '' );

		await type( input, 'an' );
		const options = document.querySelectorAll( '[role="option"]' );
		expect( [ ...options ].map( ( o ) => o.textContent.trim() ) ).toEqual( [ 'Banana' ] );
		expect( input.getAttribute( 'aria-activedescendant' ) ).toBe( options[ 0 ].id );

		await key( input, 'Enter' );
		expect( run ).toHaveBeenCalledTimes( 1 );
		expect( store.open ).toBe( false );
	} );

	it( 'moves the highlight with the arrow keys and wraps', async () => {
		setup();
		const input = await openWith( '/fruit ' );
		const selected = () => document.querySelector( '[aria-selected="true"]' ).textContent.trim();
		expect( selected() ).toBe( 'Apple' );
		await key( input, 'ArrowDown' );
		expect( selected() ).toBe( 'Banana' );
		await key( input, 'ArrowDown' );
		expect( selected() ).toBe( 'Apple' );
		await key( input, 'ArrowUp' );
		expect( selected() ).toBe( 'Banana' );
	} );

	it( 'leaves the mode with Backspace in an empty input', async () => {
		setup();
		const input = await openWith( '/fruit ' );
		await key( input, 'Backspace' );
		expect( document.querySelector( '.tacp-chip' ) ).toBe( null );
	} );

	it( 'lists modes after / and enters one with Enter', async () => {
		setup();
		const input = await openWith( '/fr' );
		expect( document.querySelector( '.tacp-item__badge' ).textContent ).toBe( '/fruit' );
		await key( input, 'Enter' );
		expect( document.querySelector( '.tacp-chip__label' ).textContent ).toBe( 'Fruit' );
	} );

	it( 'labels the dialog and shows a no-results state', async () => {
		setup();
		const input = await openWith( '/fruit ' );
		await type( input, 'zzz' );
		expect( document.querySelector( '[role="dialog"]' ).getAttribute( 'aria-label' ) ).toBe( 'Command palette' );
		expect( document.querySelector( '.tacp-state__title' ).textContent.trim() ).toBe( 'No results' );
	} );
} );
