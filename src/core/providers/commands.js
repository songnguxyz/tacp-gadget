import icons from '../icons.js';
import { copyText, safeUrl } from '../items.js';
import { defineCommand } from '../services/registry.js';

const go = ( title, params ) => location.assign( mw.util.getUrl( title, params ) );
const isTalk = ( ns ) => ns >= 0 && ns % 2 === 1;

/** Shown on an empty query: three common commands and one that depends on the page */
export const SUGGESTED = [ 'tacp-cmd-edit', 'tacp-cmd-history', 'tacp-cmd-random', 'tacp-cmd-talk', 'tacp-cmd-subject' ];

export const builtinCommands = [
	{
		id: 'tacp-cmd-edit',
		label: 'tacp-cmd-edit',
		description: 'tacp-cmd-edit-desc',
		icon: icons.edit,
		isAvailable: ( ctx ) => ctx.canEdit,
		run: ( ctx ) => go( ctx.title, { action: 'edit' } )
	},
	{
		id: 'tacp-cmd-history',
		label: 'tacp-cmd-history',
		description: 'tacp-cmd-history-desc',
		icon: icons.history,
		isAvailable: ( ctx ) => ctx.articleId > 0,
		run: ( ctx ) => go( ctx.title, { action: 'history' } )
	},
	{
		id: 'tacp-cmd-random',
		label: 'tacp-cmd-random',
		description: 'tacp-cmd-random-desc',
		icon: icons.die,
		run: () => go( 'Special:Random' )
	},
	{
		id: 'tacp-cmd-talk',
		label: 'tacp-cmd-talk',
		description: 'tacp-cmd-talk-desc',
		icon: icons.speechBubbles,
		isAvailable: ( ctx ) => ctx.namespace >= 0 && !isTalk( ctx.namespace ),
		run: ( ctx ) => go( mw.Title.newFromText( ctx.title ).getTalkPage().getPrefixedText() )
	},
	{
		id: 'tacp-cmd-subject',
		label: 'tacp-cmd-subject',
		description: 'tacp-cmd-subject-desc',
		icon: icons.article,
		isAvailable: ( ctx ) => isTalk( ctx.namespace ),
		run: ( ctx ) => go( mw.Title.newFromText( ctx.title ).getSubjectPage().getPrefixedText() )
	},
	{
		id: 'tacp-cmd-recentchanges',
		label: 'tacp-cmd-recentchanges',
		description: 'tacp-cmd-recentchanges-desc',
		icon: icons.recentChanges,
		run: () => go( 'Special:RecentChanges' )
	},
	{
		id: 'tacp-cmd-copylink',
		label: 'tacp-cmd-copylink',
		description: 'tacp-cmd-copylink-desc',
		icon: icons.link,
		run: ( ctx ) => copyText( safeUrl( mw.util.getUrl( ctx.title ) ) )
	}
].map( defineCommand );
