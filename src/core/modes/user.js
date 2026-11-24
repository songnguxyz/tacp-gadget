import { apiGet } from '../services/api.js';
import { getSiteInfo } from '../services/siteinfo.js';
import { pageItem } from '../items.js';
import icons from '../icons.js';
import { msg } from '../text.js';

// UserProfileV2: avatar and "about me". One request per user, as the
// extension has no batch query; a failure only loses that user's profile.
// ponytail: up to 10 parallel requests per keystroke, batch if the extension gains one
function getProfiles( users, signal ) {
	return getSiteInfo().then( ( info ) => Promise.all( users.map( ( u ) => (
		info.extensions.includes( 'UserProfileV2' ) ?
			// eslint-disable-next-line camelcase
			apiGet( { action: 'query', list: 'queryuserprofilev2', user_name: u.name }, signal )
				.then( ( data ) => data.query || {}, () => ( {} ) ) :
			{}
	) ) ), () => users.map( () => ( {} ) ) );
}

function userItem( u, profile ) {
	const avatar = profile[ 'profile-avatar' ];
	return pageItem( mw.Title.makeTitle( 2, u.name ), {
		label: u.name,
		badge: '',
		icon: icons.user,
		thumbnail: avatar ? { url: avatar } : undefined,
		description: [
			msg( 'tacp-user-edits', mw.language.convertNumber( u.editcount || 0 ), u.editcount || 0 ),
			profile[ 'profile-aboutme' ]
		].filter( Boolean ).join( ' · ' ),
		actions: [
			{ id: 'contribs', label: msg( 'tacp-action-contribs' ), icon: icons.userContributions, url: mw.util.getUrl( 'Special:Contributions/' + u.name ) },
			{ id: 'talk', label: msg( 'tacp-action-talk' ), icon: icons.userTalk, url: mw.Title.makeTitle( 3, u.name ).getUrl() }
		]
	} );
}

export default {
	id: 'tacp-user',
	trigger: '/user',
	label: 'tacp-mode-user',
	description: 'tacp-mode-user-desc',
	icon: icons.user,
	getResults( query, context, signal ) {
		const params = { action: 'query', list: 'allusers', aulimit: 10, auprop: 'editcount' };
		// Normalise case the way this wiki does for user names
		const prefix = query.trim() && mw.Title.makeTitle( 2, query.trim() );
		if ( prefix ) {
			params.auprefix = prefix.getMainText();
		}
		return apiGet( params, signal ).then( ( data ) => {
			const users = data.query.allusers;
			return getProfiles( users, signal ).then( ( profiles ) => [ {
				id: 'users',
				label: msg( 'tacp-group-users' ),
				items: users.map( ( u, i ) => userItem( u, profiles[ i ] ) )
			} ] );
		} );
	}
};
