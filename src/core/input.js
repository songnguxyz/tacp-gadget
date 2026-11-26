import { namespaceForPrefix } from './modes/ns.js';

// "#" jumps to a section, "@" to another language, as in the command palette
// user script by Peter Coombe (User:The wub), Wikimedia Hackathon 2026 (T425060);
// ">" lists the menus, as it lists commands in code editors' palettes
const ALIASES = { '#': 'tacp-section', '@': 'tacp-lang', '>': 'tacp-action' };

/**
 * Detect a mode trigger typed at the start of the input, e.g. "/user al".
 * The trigger only counts once followed by a space; an alias ("#", "@", ">")
 * counts at once. A namespace name and colon ("Template:") scopes the search
 * to that namespace, through /ns, and so does "{{" for templates.
 *
 * @param {string} query
 * @param {Object[]} modes Available modes
 * @return {{mode: Object, rest: string}|null}
 */
export function parseTrigger( query, modes ) {
	// One-character shortcuts that enter a mode straight away
	const aliasId = ALIASES[ query.charAt( 0 ) ];
	const alias = aliasId && modes.find( ( x ) => x.id === aliasId );
	if ( alias ) {
		return { mode: alias, rest: query.slice( 1 ) };
	}
	const hasNs = modes.some( ( x ) => x.id === 'tacp-ns' );
	// "{{" searches templates, with or without the closing "}}"
	if ( hasNs && query.startsWith( '{{' ) ) {
		return { mode: namespaceForPrefix( 'template' ), rest: query.slice( 2 ).replace( /\}\}\s*$/, '' ) };
	}
	const prefixed = /^([^:/]+):([\s\S]*)$/.exec( query );
	const scoped = prefixed && hasNs && namespaceForPrefix( prefixed[ 1 ] );
	if ( scoped ) {
		return { mode: scoped, rest: prefixed[ 2 ] };
	}
	const m = /^(\/\S+)\s([\s\S]*)$/.exec( query );
	if ( !m ) {
		return null;
	}
	const trigger = m[ 1 ].toLowerCase();
	const mode = modes.find( ( x ) => x.trigger.toLowerCase() === trigger );
	return mode ? { mode, rest: m[ 2 ] } : null;
}
