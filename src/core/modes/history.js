import { apiGet } from '../services/api.js';
import icons from '../icons.js';
import { msg, matches } from '../text.js';

function formatTime( iso ) {
	try {
		return new Date( iso ).toLocaleString( mw.language.bcp47( mw.config.get( 'wgUserLanguage' ) ) );
	} catch ( e ) {
		return iso;
	}
}

export default {
	id: 'tacp-history',
	trigger: '/history',
	label: 'tacp-mode-history',
	description: 'tacp-mode-history-desc',
	isAvailable: ( context ) => context.articleId > 0,
	getResults( query, context, signal ) {
		return apiGet( {
			action: 'query',
			prop: 'revisions',
			pageids: context.articleId,
			rvprop: 'ids|timestamp|user|comment|size',
			rvlimit: 20
		}, signal ).then( ( data ) => {
			const revs = ( data.query.pages[ 0 ] && data.query.pages[ 0 ].revisions ) || [];
			return [ {
				id: 'revisions',
				label: msg( 'tacp-group-revisions' ),
				items: revs
					.filter( ( r ) => matches( ( r.user || '' ) + ' ' + ( r.comment || '' ), query ) )
					.map( ( r ) => ( {
						id: String( r.revid ),
						// The user can be hidden (revision deletion); no dangling separator then
						label: [ formatTime( r.timestamp ), r.user ].filter( Boolean ).join( ' · ' ),
						description: r.comment || '',
						icon: icons.history,
						url: mw.util.getUrl( context.title, { oldid: r.revid } ),
						actions: r.parentid ? [ {
							id: 'diff',
							label: msg( 'tacp-action-diff' ),
							icon: icons.recentChanges,
							url: mw.util.getUrl( context.title, { diff: r.revid, oldid: r.parentid } )
						} ] : []
					} ) )
			} ];
		} );
	}
};
