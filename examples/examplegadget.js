/**
 * Example gadget extending TACP with one mode and one command.
 * Install as MediaWiki:Gadget-examplegadget.js with:
 *
 *     * examplegadget[ResourceLoader|dependencies=mediawiki.util]|examplegadget.js
 */
mw.hook( 'tacp.register' ).add( ( tacp ) => {
	if ( tacp.apiVersion < 1 ) {
		return;
	}

	// "/watch" lists pages on the user's watchlist matching the query
	tacp.register( tacp.defineMode( {
		id: 'examplegadget-watch',
		trigger: '/watch',
		label: 'Watchlist',
		description: 'Pages you are watching',
		isAvailable: ( context ) => context.userName !== null,
		getResults: ( query, context, signal ) => {
			const url = mw.util.wikiScript( 'api' ) + '?' + new URLSearchParams( {
				action: 'query',
				list: 'watchlistraw',
				wrlimit: 50,
				format: 'json',
				formatversion: 2
			} );
			return fetch( url, { signal } )
				.then( ( res ) => res.json() )
				.then( ( data ) => [ {
					label: 'Watched pages',
					items: data.watchlistraw
						.filter( ( page ) => page.title.toLowerCase().includes( query.toLowerCase() ) )
						.map( ( page ) => ( {
							id: page.title,
							label: page.title,
							title: page.title,
							url: mw.util.getUrl( page.title ),
							icon: tacp.icons.article
						} ) )
				} ] );
		}
	} ) );

	// A command that only navigates; purge asks for confirmation on its own page
	tacp.register( tacp.defineCommand( {
		id: 'examplegadget-purge',
		label: 'Purge this page',
		description: 'Clear the server cache for the current page',
		icon: tacp.icons.reload,
		isAvailable: ( context ) => context.articleId > 0,
		run: ( context ) => location.assign( mw.util.getUrl( context.title, { action: 'purge' } ) )
	} ) );
} );
