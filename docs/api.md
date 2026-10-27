# TACP public API

Other gadgets add modes and commands to TACP through a hook. API version: **1**.

```js
mw.hook( 'tacp.register' ).add( function ( tacp ) {
	if ( tacp.apiVersion < 1 ) {
		return;
	}
	tacp.register( tacp.defineCommand( {
		id: 'mygadget-purge',
		label: 'Purge this page',
		description: 'Clear the server cache for the current page',
		icon: tacp.icons.reload,
		confirm: true,
		run: function ( context ) {
			location.assign( mw.util.getUrl( context.title, { action: 'purge' } ) );
		}
	} ) );
} );
```

A complete example that registers a mode and a command is in
[`examples/examplegadget.js`](../examples/examplegadget.js).

## Members of `tacp`

| Member | Purpose |
|---|---|
| `apiVersion` | Integer major version of this API |
| `register( item )` | Adds a mode or command. Returns `true` if it was added |
| `defineMode( spec )` | Validates and normalises a mode; warns on unknown keys; returns `null` if invalid |
| `defineCommand( spec )` | Same, for a single command |
| `icons` | The Codex icons TACP bundles, e.g. `tacp.icons.reload` |
| `open( prefill? )`, `close()` | Programmatic control |

`mw.hook( 'tacp.ready' )` fires right after `tacp.register`, with the same object.

## Mode spec

| Key | Required | Meaning |
|---|---|---|
| `id` | ✔ | Unique, prefixed by the owning gadget's name |
| `trigger` | ✔ | e.g. `/mygadget`; no spaces |
| `label`, `description` | ✔ | Message keys or plain strings |
| `getResults( query, context, signal )` | ✔ | Returns result groups, or a Promise of them; must honour `signal` (an `AbortSignal`) |
| `layout` | | `list` (default). `gallery` is accepted but only takes effect from TACP v2 |
| `getItemDetail( item, signal )` | | Accepted; used by the detail pane from TACP v2 |
| `isAvailable( context )` | | Return `false` to hide the mode on this page |

The user enters a mode by typing its trigger followed by a space, or by picking it
from the list shown after `/`. `query` is the text typed after the trigger.
`getResults` runs again on every change, 150 ms after typing stops, and the
previous call's `signal` is aborted.

## Command spec

| Key | Required | Meaning |
|---|---|---|
| `id` | ✔ | Unique, prefixed by the owning gadget's name |
| `label`, `description` | ✔ | Message keys or plain strings |
| `run( context )` | ✔ | What the command does. The palette closes first |
| `icon` | | One of `tacp.icons` (the object, or its name as a string) |
| `confirm` | | `true` makes TACP ask the user before calling `run` |
| `isAvailable( context )` | | Return `false` to hide the command on this page |

Commands appear when the typed text matches their label.

## Result groups

`getResults` returns an array of groups:

```js
[ {
	label: 'Fruit',
	items: [ {
		id: 'apple',                 // unique within the group
		label: 'Apple',              // required
		description: 'A fruit',      // optional, one line
		badge: 'Food',               // optional, small tag after the label
		icon: tacp.icons.article,    // optional, ignored when thumbnail is set
		thumbnail: { url: '…' },     // optional
		title: 'Apple',              // optional wiki page title: enables Shift+Enter (edit) and Recent
		url: '/wiki/Apple',          // opened on Enter; Ctrl/Cmd+Enter opens a new tab
		run: function () {},         // called on Enter instead of opening url
		actions: [                   // optional secondary actions, reached with →
			{ id: 'edit', label: 'Edit', icon: tacp.icons.edit, url: '…' }
		]
	} ]
} ]
```

Everything is rendered as plain text, never HTML. Only `http:`, `https:` and
relative URLs are kept; any other `url` is dropped. Empty groups are hidden.

## Context

`context` is a frozen object describing the current page:

| Key | Meaning |
|---|---|
| `title` | `wgPageName` |
| `namespace` | `wgNamespaceNumber` |
| `articleId`, `revisionId` | `wgArticleId`, `wgRevisionId` |
| `action` | `wgAction` |
| `isArticle` | `wgIsArticle` |
| `canEdit` | `wgIsProbablyEditable` |
| `userName` | `wgUserName` (`null` for logged-out users) |
| `skin` | The skin name |

## Rules for registrants

- **Naming.** Every `id` starts with your gadget's name, e.g. `mygadget-purge`.
  The `tacp-` prefix is reserved for TACP.
- **Trigger collisions.** `/ns`, `/action`, `/user`, `/category`, `/history`,
  `/help`, `/file`, `/cargo`, `/bucket` and `/smw` are reserved. For any other
  trigger the first registration wins; later ones are rejected with a
  `mw.log.warn` and the user sees nothing.
- **No overriding built-ins.** Wikis hide built-in modes with `disabledModes` in
  `MediaWiki:Gadget-TACP-config.json`.
- **Plain text only.** Labels, descriptions and result fields are rendered as text.
- **Writing to the wiki.** TACP itself never writes. A registered `run()` may;
  that is your gadget's responsibility. Commands that change anything should set
  `confirm: true`.
- **Ordering.** Your results appear after TACP's own within the same group.

## Timing

- `tacp.register` fires when the TACP core loads, the first time the palette is
  opened in a page view (or earlier if the wiki turned on `prefetch`).
- `mw.hook` remembers its last payload, so a gadget that loads later still
  receives `tacp.register`.
- To open the palette from your gadget without waiting for the core:

  ```js
  mw.loader.using( 'ext.gadget.TACP' ).then( function ( require ) {
  	require( 'ext.gadget.TACP' ).open( '/mygadget ' );
  } );
  ```

## Stability

- The API follows semver through `apiVersion`. From TACP 1.0.0, TACP's major
  version equals `apiVersion`.
- A deprecated member keeps working, with a `mw.log.warn`, for at least one minor
  release, and is removed only in the next major release.
