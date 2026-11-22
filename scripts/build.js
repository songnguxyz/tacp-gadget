// Builds the four gadget files, the default config and the gadget definitions into dist/.
import { build, transformWithEsbuild } from 'vite';
import vue from '@vitejs/plugin-vue';
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, copyFileSync, mkdirSync, rmSync, readdirSync } from 'node:fs';
import cssjanus from 'cssjanus';

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

const coreDeps = deps[ 'TACP-core' ].filter( ( dep ) => dep !== 'ext.gadget.TACP' );
// Build-time constants of src/loader/TACP.js
const defines = ( flags = {} ) => Object.assign( {
	__LOADER_MESSAGES__: JSON.stringify( loaderMessages ),
	__CDN__: 'false',
	__CDN_BASE__: '""',
	__CORE_DEPS__: JSON.stringify( coreDeps )
}, flags );
// Skips loading where the gadget or another copy of the CDN build already runs
const alreadyRunning = `var running = [ 'loading', 'loaded', 'executing', 'ready' ];
	if ( window.tacpCdn || running.indexOf( mw.loader.getState( 'ext.gadget.TACP' ) ) !== -1 ) {
		console.warn( 'TACP is already running on this page.' );
		return;
	}`;

rmSync( 'dist', { recursive: true, force: true } );
mkdirSync( 'dist' );

for ( const [ name, entry ] of [ [ 'TACP', 'src/loader/TACP.js' ], [ 'TACP-core', 'src/core/init.js' ] ] ) {
	await build( {
		configFile: false,
		logLevel: 'warn',
		plugins: [ vue() ],
		define: defines(),
		build: {
			outDir: 'dist',
			emptyOutDir: false,
			// The oldest maintained LTS (1.43) runs JS only on Chrome 63+, Firefox 58+,
			// Safari 11.1+; raise this when the floor moves to the next LTS (README)
			target: 'es2018',
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

// The CDN files, for wikis that load TACP from jsDelivr with one line instead
// of installing the gadget (docs/deploy.md). TACP-cdn.js is the loader; when
// the palette first opens it loads the gadget's core, wrapped as
// window.tacpCdnCore, and its styles, from the same directory. ResourceLoader
// does not flip these files for right-to-left languages, so CSSJanus does it
// here. Nothing minifies them on the way either, so the build does.
const minify = async ( code, file ) => ( await transformWithEsbuild( code, file, { minify: true, legalComments: 'none', target: 'es2018' } ) ).code;
await build( {
	configFile: false,
	logLevel: 'warn',
	plugins: [ vue() ],
	define: defines( { __CDN__: 'true', __CDN_BASE__: 'cdnBase' } ),
	build: {
		outDir: 'build/cdn',
		emptyOutDir: true,
		target: 'es2018',
		minify: false,
		lib: { entry: 'src/loader/TACP.js', formats: [ 'cjs' ], fileName: () => 'loader.js', cssFileName: 'loader' },
		rollupOptions: { output: { exports: 'named' } }
	}
} );
const loaderCss = await minify( readFileSync( 'build/cdn/loader.css', 'utf8' ), 'loader.css' );
writeFileSync( 'dist/TACP-cdn.js', header + await minify( `( function () {
	${ alreadyRunning }
	window.tacpCdn = true;
	// Captured now: currentScript is only set while this file first runs
	var cdnBase = ( document.currentScript ? document.currentScript.src : '' ).replace( /[^/]*$/, '' );
	mw.loader.using( ${ JSON.stringify( deps.TACP ) } ).then( function ( require ) {
		mw.util.addCSS( document.documentElement.dir === 'rtl' ?
			${ JSON.stringify( cssjanus.transform( loaderCss ) ) } :
			${ JSON.stringify( loaderCss ) } );
		var module = { exports: {} }, exports = module.exports;
${ readFileSync( 'build/cdn/loader.js', 'utf8' ) }
	} );
}() );
`, 'TACP-cdn.js' ) );
const coreJs = readFileSync( 'dist/TACP-core.js', 'utf8' ).replace( header, '' );
writeFileSync( 'dist/TACP-cdn-core.js', header + await minify( `window.tacpCdnCore = function ( require ) {
	var module = { exports: {} }, exports = module.exports;
${ coreJs }
	return module.exports;
};
`, 'TACP-cdn-core.js' ) );
const coreCss = await minify( readFileSync( 'dist/TACP-core.css', 'utf8' ).replace( header, '' ), 'core.css' );
writeFileSync( 'dist/TACP-cdn-core.css', header + coreCss );
writeFileSync( 'dist/TACP-cdn-core.rtl.css', header + cssjanus.transform( coreCss ) );

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

// Preferences description, one subpage per language. The base page must be in
// the wiki's content language, which the build cannot know, so it shows the
// subpage for that language. A content language without a subpage shows a
// red link until the wiki creates one.
const descriptions = readdirSync( 'i18n/description' ).map( ( name ) => name.replace( /\.wiki$/, '' ) );
for ( const lang of descriptions ) {
	copyFileSync( `i18n/description/${ lang }.wiki`, `dist/Gadget-TACP.${ lang }.wiki` );
}
writeFileSync( 'dist/Gadget-TACP.wiki', '{{MediaWiki:Gadget-TACP/{{CONTENTLANGUAGE}}}}\n' );

// Manifest for Litmus gadget-deploy: which file goes to which wiki page.
// createOnly pages belong to the wiki once created.
const manifest = {
	pages: [ 'TACP.js', 'TACP.css', 'TACP-core.js', 'TACP-core.css' ]
		.map( ( file ) => ( { file, title: 'MediaWiki:Gadget-' + file } ) )
		.concat( { file: 'TACP-config.json', title: 'MediaWiki:Gadget-TACP-config.json', createOnly: true } )
		.concat( { file: 'Gadget-TACP.wiki', title: 'MediaWiki:Gadget-TACP', createOnly: true } )
		// ponytail: Litmus takes at most 8 files per release, so only the
		// Vietnamese text is deployed; other languages are created by hand
		// from the release assets. Add them here if Litmus raises its limit.
		.concat( [ 'vi' ].map( ( lang ) => ( {
			file: `Gadget-TACP.${ lang }.wiki`, title: 'MediaWiki:Gadget-TACP/' + lang, createOnly: true
		} ) ) ),
	definition: { file: 'Gadgets-definition.txt' }
};
// Litmus rejects the whole release otherwise (rc.6)
if ( manifest.pages.length + 1 > 8 ) {
	throw new Error( 'deploy.json lists ' + ( manifest.pages.length + 1 ) + ' files; Litmus takes at most 8' );
}
writeFileSync( 'dist/deploy.json', JSON.stringify( manifest, null, '\t' ) + '\n' );

console.log( `Built TACP v${ pkg.version } (${ sha }) into dist/` );
