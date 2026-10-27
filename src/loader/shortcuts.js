const EDITABLE = 'input, textarea, select, [contenteditable]:not([contenteditable="false"]), ' +
	'.ve-ce-surface, .cm-editor, .CodeMirror';

/**
 * @param {EventTarget|null} el
 * @return {boolean}
 */
export function isEditable( el ) {
	return !!el && el.nodeType === 1 && ( el.isContentEditable || !!el.closest( EDITABLE ) );
}

/**
 * Decide what a keydown means for TACP. Keys are matched on event.code
 * first so non-Latin layouts and Vietnamese input methods still work.
 *
 * @param {KeyboardEvent} e
 * @param {boolean} slashEnabled
 * @return {string|null} 'toggle', 'open' or null
 */
export function shortcutFor( e, slashEnabled ) {
	// defaultPrevented: an editor (e.g. VisualEditor's Ctrl+K) already used the key
	if ( e.repeat || e.isComposing || e.defaultPrevented ) {
		return null;
	}
	const mod = e.ctrlKey || e.metaKey;
	if ( mod && !e.altKey && !e.shiftKey && ( e.code === 'KeyK' || e.key === 'k' || e.key === 'K' ) ) {
		return 'toggle';
	}
	if (
		slashEnabled && !mod && !e.altKey &&
		( ( e.code === 'Slash' && !e.shiftKey ) || e.key === '/' ) &&
		!isEditable( e.target )
	) {
		return 'open';
	}
	return null;
}
