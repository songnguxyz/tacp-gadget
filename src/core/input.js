/**
 * Detect a mode trigger typed at the start of the input, e.g. "/user al".
 * The trigger only counts once followed by a space.
 *
 * @param {string} query
 * @param {Object[]} modes Available modes
 * @return {{mode: Object, rest: string}|null}
 */
export function parseTrigger( query, modes ) {
	const m = /^(\/\S+)\s([\s\S]*)$/.exec( query );
	if ( !m ) {
		return null;
	}
	const trigger = m[ 1 ].toLowerCase();
	const mode = modes.find( ( x ) => x.trigger.toLowerCase() === trigger );
	return mode ? { mode, rest: m[ 2 ] } : null;
}
