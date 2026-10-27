// Builds the four gadget files, the default config and the gadget definitions into dist/.
import { build } from 'vite';
import vue from '@vitejs/plugin-vue';
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, copyFileSync, mkdirSync, rmSync } from 'node:fs';

const pkg = JSON.parse( readFileSync( 'package.json', 'utf8' ) );
const sha = ( process.env.GITHUB_SHA || execSync( 'git rev-parse HEAD' ).toString() ).trim().slice( 0, 7 );
const header = `/*! TACP v${ pkg.version } (${ sha }) | MIT License | https://github.com/songnguxyz/tacp-gadget
 * Built file: do not edit on-wiki. Edit the repository and redeploy. */
`;

// The loader carries only the messages it shows before the core loads
const loaderMessages = {};
for ( const lang of [ 'en', 'vi' ] ) {
	const all = JSON.parse( readFileSync( `i18n/${ lang }.json`, 'utf8' ) );
	loaderMessages[ lang ] = Object.fromEntries(
		Object.entries( all ).filter( ( [ key ] ) => key.startsWith( 'tacp-loader-' ) )
	);
}

// Opt-in while release candidates are tested on hsckwiki; true from 1.0 (spec §4.2)
const DEFAULT_ON = false;

const deps = {
	TACP: [ 'mediawiki.util' ],
	'TACP-core': [
		'ext.gadget.TACP', 'vue', '@wikimedia/codex', 'mediawiki.api', 'mediawiki.jqueryMsg',
		'mediawiki.language', 'mediawiki.storage', 'mediawiki.Title', 'mediawiki.user',
		'mediawiki.util', 'user.options'
	]
};

rmSync( 'dist', { recursive: true, force: true } );
mkdirSync( 'dist' );

for ( const [ name, entry ] of [ [ 'TACP', 'src/loader/TACP.js' ], [ 'TACP-core', 'src/core/init.js' ] ] ) {
	await build( {
		configFile: false,
		logLevel: 'warn',
		plugins: [ vue() ],
		define: { __LOADER_MESSAGES__: JSON.stringify( loaderMessages ) },
		build: {
			outDir: 'dist',
			emptyOutDir: false,
			target: 'es2015',
			minify: false,
			lib: { entry, formats: [ 'cjs' ], fileName: () => name + '.js', cssFileName: name },
			rollupOptions: {
				// Served by ResourceLoader; never bundled
				external: [ 'vue', '@wikimedia/codex', 'ext.gadget.TACP', './TACP-config.json' ],
				output: { exports: 'named' }
			}
		}
	} );
	for ( const ext of [ 'js', 'css' ] ) {
		const file = `dist/${ name }.${ ext }`;
		writeFileSync( file, header + readFileSync( file, 'utf8' ) );
	}
}

copyFileSync( 'src/loader/TACP-config.json', 'dist/TACP-config.json' );

// Legacy MediaWiki:Gadgets-definition lines
writeFileSync( 'dist/Gadgets-definition.txt', [
	`* TACP[ResourceLoader|${ DEFAULT_ON ? 'default|' : '' }package|requiresES6|dependencies=${ deps.TACP }]|TACP.js|TACP-config.json|TACP.css`,
	`* TACP-core[ResourceLoader|hidden|package|requiresES6|dependencies=${ deps[ 'TACP-core' ] }]|TACP-core.js|TACP-core.css`
].join( '\n' ) + '\n' );

// MediaWiki:Gadgets/<name>.json for wikis using JSON definitions
const jsonDefinition = ( pages, settings, dependencies ) => JSON.stringify( {
	settings: Object.assign( { rights: [], default: false, hidden: false, package: true, requiresES6: true, category: '' }, settings ),
	module: { pages, dependencies, peers: [], messages: [], type: 'general' }
}, null, '\t' ) + '\n';
writeFileSync( 'dist/Gadgets-TACP.json', jsonDefinition( [ 'TACP.js', 'TACP-config.json', 'TACP.css' ], { default: DEFAULT_ON }, deps.TACP ) );
writeFileSync( 'dist/Gadgets-TACP-core.json', jsonDefinition( [ 'TACP-core.js', 'TACP-core.css' ], { hidden: true }, deps[ 'TACP-core' ] ) );

// Manifest for Litmus gadget-deploy: which file goes to which wiki page
writeFileSync( 'dist/deploy.json', JSON.stringify( {
	pages: [ 'TACP.js', 'TACP.css', 'TACP-core.js', 'TACP-core.css' ]
		.map( ( file ) => ( { file, title: 'MediaWiki:Gadget-' + file } ) )
		.concat( { file: 'TACP-config.json', title: 'MediaWiki:Gadget-TACP-config.json', createOnly: true } ),
	definition: { file: 'Gadgets-definition.txt' }
}, null, '\t' ) + '\n' );

console.log( `Built TACP v${ pkg.version } (${ sha }) into dist/` );
