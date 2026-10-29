// Built-in triggers, reserved even before their mode exists (v2, v3)
export const RESERVED_TRIGGERS = [
	'/ns', '/action', '/user', '/category', '/history', '/help', '/section', '/lang',
	'/file', '/cargo', '/bucket', '/smw'
];

const isFn = ( v ) => typeof v === 'function';
const isStr = ( v ) => typeof v === 'string' && v !== '';
const optional = ( check ) => ( v ) => v === undefined || check( v );

const MODE_KEYS = {
	id: isStr,
	trigger: ( v ) => isStr( v ) && /^\/\S+$/.test( v ),
	label: isStr,
	description: isStr,
	getResults: isFn,
	layout: optional( ( v ) => v === 'list' || v === 'gallery' ),
	getItemDetail: optional( isFn ),
	isAvailable: optional( isFn )
};

const COMMAND_KEYS = {
	id: isStr,
	label: isStr,
	description: isStr,
	run: isFn,
	icon: optional( ( v ) => !!v && ( typeof v === 'string' || typeof v === 'object' ) ),
	confirm: optional( ( v ) => typeof v === 'boolean' ),
	isAvailable: optional( isFn )
};

function define( kind, keys, spec ) {
	if ( !spec || typeof spec !== 'object' ) {
		mw.log.warn( 'TACP: ' + kind + ' spec must be an object' );
		return null;
	}
	const out = { kind };
	Object.keys( spec ).forEach( ( key ) => {
		if ( !keys[ key ] ) {
			mw.log.warn( 'TACP: unknown ' + kind + ' key "' + key + '" in ' + spec.id );
		}
	} );
	for ( const key of Object.keys( keys ) ) {
		if ( !keys[ key ]( spec[ key ] ) ) {
			mw.log.warn( 'TACP: invalid or missing ' + kind + ' key "' + key + '" in ' + spec.id );
			return null;
		}
		if ( spec[ key ] !== undefined ) {
			out[ key ] = spec[ key ];
		}
	}
	if ( kind === 'mode' && !out.layout ) {
		out.layout = 'list';
	}
	return Object.freeze( out );
}

export function defineMode( spec ) {
	return define( 'mode', MODE_KEYS, spec );
}

export function defineCommand( spec ) {
	return define( 'command', COMMAND_KEYS, spec );
}

/**
 * Call an optional isAvailable(); a throwing check hides the item.
 *
 * @param {Object} item
 * @param {Object} context
 * @return {boolean}
 */
function available( item, context ) {
	if ( !item.isAvailable ) {
		return true;
	}
	try {
		return item.isAvailable( context ) !== false;
	} catch ( e ) {
		mw.log.warn( 'TACP: isAvailable() of ' + item.id + ' threw', e );
		return false;
	}
}

/**
 * @param {string[]} disabledModes Mode ids the wiki hides
 * @return {Object}
 */
export function createRegistry( disabledModes ) {
	const modes = [];
	const commands = [];
	const ids = new Set();

	/**
	 * @param {Object} item Output of defineMode/defineCommand, or a raw spec
	 * @param {boolean} [builtin] Only TACP itself passes true
	 * @return {boolean} Whether it was added
	 */
	function register( item, builtin ) {
		if ( item && !item.kind ) {
			item = 'trigger' in item ? defineMode( item ) : defineCommand( item );
		}
		if ( !item ) {
			return false;
		}
		const reject = ( why ) => {
			mw.log.warn( 'TACP: ' + item.kind + ' "' + item.id + '" rejected: ' + why );
			return false;
		};
		if ( !builtin && item.id.indexOf( 'tacp-' ) === 0 ) {
			return reject( 'the tacp- prefix is reserved' );
		}
		if ( ids.has( item.id ) ) {
			return reject( 'id already registered' );
		}
		if ( item.kind === 'mode' ) {
			const trigger = item.trigger.toLowerCase();
			if ( !builtin && RESERVED_TRIGGERS.includes( trigger ) ) {
				return reject( 'trigger ' + trigger + ' is reserved' );
			}
			if ( modes.some( ( m ) => m.trigger.toLowerCase() === trigger ) ) {
				return reject( 'trigger ' + trigger + ' already registered' );
			}
		}
		ids.add( item.id );
		( item.kind === 'mode' ? modes : commands ).push( item );
		return true;
	}

	return {
		register,
		/**
		 * @param {Object} context
		 * @return {Object[]} Modes usable on this page, TACP's own first
		 */
		getModes: ( context ) => modes.filter(
			( m ) => !disabledModes.includes( m.id ) && available( m, context )
		),
		/**
		 * @param {Object} context
		 * @return {Object[]} Commands usable on this page, TACP's own first
		 */
		getCommands: ( context ) => commands.filter( ( c ) => available( c, context ) )
	};
}
