import icons from '../icons.js';
import { msg, matches, text } from '../text.js';
import { modeItem } from '../results.js';
import { clearRecent } from '../services/recent.js';

/**
 * @param {Object} registry
 * @return {Object} Mode spec listing every mode available on this page
 */
export default function createHelpMode( registry ) {
	return {
		id: 'tacp-help',
		trigger: '/help',
		label: 'tacp-mode-help',
		description: 'tacp-mode-help-desc',
		getResults( query, context ) {
			const modes = registry.getModes( context )
				.filter( ( m ) => matches( m.trigger + ' ' + text( m.label ) + ' ' + text( m.description ), query ) )
				.map( modeItem );
			const tools = [ {
				id: 'clear-recent',
				label: msg( 'tacp-cmd-clear-recent' ),
				icon: icons.trash,
				run: () => {
					clearRecent();
					mw.notify( msg( 'tacp-recent-cleared' ) );
				}
			} ].filter( ( item ) => matches( item.label, query ) );
			return [
				{ id: 'modes', label: msg( 'tacp-group-modes' ), items: modes },
				{ id: 'tools', label: msg( 'tacp-group-tools' ), items: tools }
			];
		}
	};
}
