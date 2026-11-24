/* global __TACP_VERSION__ */
import icons from '../icons.js';
import { msg, matches } from '../text.js';

const REPO = 'https://github.com/songnguxyz/tacp-gadget';

export default {
	id: 'tacp-about',
	trigger: '/about',
	label: 'tacp-mode-about',
	description: 'tacp-mode-about-desc',
	getResults( query ) {
		const items = [ {
			id: 'about-version',
			label: 'TACP ' + __TACP_VERSION__,
			description: msg( 'tacp-about-version-desc' ),
			icon: icons.help,
			url: REPO + '/releases/tag/v' + __TACP_VERSION__
		}, {
			id: 'about-source',
			label: msg( 'tacp-about-source' ),
			description: msg( 'tacp-about-source-desc' ),
			icon: icons.link,
			url: REPO
		}, {
			id: 'about-issues',
			label: msg( 'tacp-about-issues' ),
			description: msg( 'tacp-about-issues-desc' ),
			icon: icons.alert,
			url: REPO + '/issues'
		}, {
			id: 'about-api',
			label: msg( 'tacp-about-api' ),
			description: msg( 'tacp-about-api-desc' ),
			icon: icons.add,
			url: REPO + '/blob/main/docs/api.md'
		}, {
			id: 'about-credits',
			label: msg( 'tacp-about-credits' ),
			description: msg( 'tacp-about-credits-desc' ),
			icon: icons.user,
			url: 'https://phabricator.wikimedia.org/T425060'
		} ].filter( ( item ) => matches( item.label + ' ' + item.description, query ) );
		return [ { id: 'about', label: msg( 'tacp-mode-about' ), items } ];
	}
};
