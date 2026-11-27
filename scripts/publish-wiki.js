// Publishes the user-script files of a release to wiki pages, e.g.
// User:Example/TACP-user.js on Meta-Wiki, which wikis then load with action=raw
// (docs/deploy.md). Logs in with a BotPassword; spaced edits, maxlag.
//
// Env: WIKI_API (https://meta.wikimedia.org/w/api.php), WIKI_USER (Name@app),
// WIKI_PASSWORD, WIKI_PREFIX (User:Name/), SUMMARY, DIR (files, default dist),
// EDIT_DELAY (seconds between edits, default 61: the bot policy's limit
// without a bot flag)
import { readFileSync } from 'node:fs';

const { WIKI_API, WIKI_USER, WIKI_PASSWORD, WIKI_PREFIX, SUMMARY } = process.env;
const DIR = process.env.DIR || 'dist';
const DELAY = Number( process.env.EDIT_DELAY || 61 ) * 1000;
// The core before the loader, so a new loader never meets an old core
const FILES = [ 'TACP-user-core.js', 'TACP-user-core.css', 'TACP-user-core.rtl.css', 'TACP-user.js' ];

if ( !WIKI_API || !WIKI_USER || !WIKI_PASSWORD || !WIKI_PREFIX ) {
	throw new Error( 'Set WIKI_API, WIKI_USER, WIKI_PASSWORD and WIKI_PREFIX' );
}

const cookies = new Map();
async function api( params, post ) {
	const body = new URLSearchParams( Object.assign( { format: 'json', formatversion: '2', maxlag: '5' }, params ) );
	const res = await fetch( post ? WIKI_API : WIKI_API + '?' + body, {
		method: post ? 'POST' : 'GET',
		body: post ? body : undefined,
		headers: {
			'User-Agent': 'TACP-release (https://github.com/songnguxyz/tacp-gadget)',
			Cookie: Array.from( cookies, ( [ k, v ] ) => k + '=' + v ).join( '; ' )
		}
	} );
	for ( const c of res.headers.getSetCookie() ) {
		const [ pair ] = c.split( ';' );
		const i = pair.indexOf( '=' );
		cookies.set( pair.slice( 0, i ), pair.slice( i + 1 ) );
	}
	const data = await res.json();
	if ( data.error ) {
		throw new Error( data.error.code + ': ' + data.error.info );
	}
	return data;
}

const token = async ( type ) => ( await api( { action: 'query', meta: 'tokens', type } ) ).query.tokens[ type + 'token' ];

const login = await api( {
	action: 'login', lgname: WIKI_USER, lgpassword: WIKI_PASSWORD, lgtoken: await token( 'login' )
}, true );
if ( login.login.result !== 'Success' ) {
	throw new Error( 'Login failed: ' + ( login.login.reason || login.login.result ) );
}
const csrf = await token( 'csrf' );

for ( const [ i, file ] of FILES.entries() ) {
	if ( i ) {
		await new Promise( ( resolve ) => {
			setTimeout( resolve, DELAY );
		} );
	}
	const title = WIKI_PREFIX + file;
	const { edit } = await api( {
		action: 'edit', title, text: readFileSync( `${ DIR }/${ file }`, 'utf8' ),
		summary: SUMMARY || 'TACP', token: csrf
	}, true );
	if ( edit.result !== 'Success' ) {
		throw new Error( title + ': ' + JSON.stringify( edit ) );
	}
	console.log( title + ': ' + ( edit.nochange ? 'unchanged' : 'revision ' + edit.newrevid ) );
}
