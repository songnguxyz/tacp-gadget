const isBool = ( v ) => typeof v === 'boolean';
const isObject = ( v ) => !!v && typeof v === 'object' && !Array.isArray( v );

const SETTINGS = {
	prefetch: [ false, isBool ],
	slashShortcut: [ true, isBool ],
	mobileButton: [ true, isBool ],
	searchTakeover: [ false, isBool ],
	disabledModes: [ [], ( v ) => Array.isArray( v ) && v.every( ( s ) => typeof s === 'string' ) ],
	cargoLimit: [ 50, ( v ) => Number.isInteger( v ) && v > 0 ],
	messages: [ {}, isObject ]
};

/**
 * Apply defaults to the wiki's MediaWiki:Gadget-TACP-config.json.
 * Unknown keys and invalid values are dropped with a warning, never fatal.
 *
 * @param {Object|null} raw
 * @return {Object}
 */
export function normalizeConfig( raw ) {
	const config = {};
	Object.keys( SETTINGS ).forEach( ( key ) => {
		config[ key ] = SETTINGS[ key ][ 0 ];
	} );
	Object.keys( isObject( raw ) ? raw : {} ).forEach( ( key ) => {
		if ( !SETTINGS[ key ] ) {
			mw.log.warn( 'TACP config: unknown key "' + key + '" ignored' );
		} else if ( !SETTINGS[ key ][ 1 ]( raw[ key ] ) ) {
			mw.log.warn( 'TACP config: invalid value for "' + key + '" ignored' );
		} else {
			config[ key ] = raw[ key ];
		}
	} );
	return Object.freeze( config );
}
