import { apiGet } from '../services/api.js';
import { pageItem } from '../items.js';
import icons from '../icons.js';
import { msg } from '../text.js';

export default {
	id: 'tacp-user',
	trigger: '/user',
	label: 'tacp-mode-user',
	description: 'tacp-mode-user-desc',
	getResults( query, context, signal ) {
		const params = { action: 'query', list: 'allusers', aulimit: 10, auprop: 'editcount' };
		// Normalise case the way this wiki does for user names
		const prefix = query.trim() && mw.Title.makeTitle( 2, query.trim() );
		if ( prefix ) {
			params.auprefix = prefix.getMainText();
		}
		return apiGet( params, signal ).then( ( data ) => [ {
			id: 'users',
			label: msg( 'tacp-group-users' ),
			items: data.query.allusers.map( ( u ) => pageItem( mw.Title.makeTitle( 2, u.name ), {
				label: u.name,
				badge: '',
				icon: icons.user,
				description: msg( 'tacp-user-edits', mw.language.convertNumber( u.editcount || 0 ), u.editcount || 0 ),
				actions: [
					{ id: 'contribs', label: msg( 'tacp-action-contribs' ), icon: icons.userContributions, url: mw.util.getUrl( 'Special:Contributions/' + u.name ) },
					{ id: 'talk', label: msg( 'tacp-action-talk' ), icon: icons.userTalk, url: mw.Title.makeTitle( 3, u.name ).getUrl() }
				]
			} ) )
		} ] );
	}
};
