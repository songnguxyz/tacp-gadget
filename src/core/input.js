// "#" jumps to a section, "@" to another language, as in the command palette
// user script by Peter Coombe (User:The wub), Wikimedia Hackathon 2026 (T425060)
export const ALIASES = { '#': 'tacp-section', '@': 'tacp-lang' };

/**
 * Detect a mode trigger typed at the start of the input, e.g. "/user al".
 * The trigger only counts once followed by a space; an alias ("#", "@")
 * counts at once.
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
	const m = /^(\/\S+)\s([\s\S]*)$/.exec( query );
	if ( !m ) {
		return null;
	}
	const trigger = m[ 1 ].toLowerCase();
	const mode = modes.find( ( x ) => x.trigger.toLowerCase() === trigger );
	return mode ? { mode, rest: m[ 2 ] } : null;
}
