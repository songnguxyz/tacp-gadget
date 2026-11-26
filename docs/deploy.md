# Deploying TACP

A release is made by pushing a tag `vX.Y.Z` (or `vX.Y.Z-rc.N`) that matches
`package.json`, or by running the Release workflow by hand with that tag (it then
creates the tag on the chosen branch). The workflow builds, creates the GitHub release
(pre-release for `-rc`) and attaches these files:

| File | Wiki page |
|---|---|
| `TACP.js` | `MediaWiki:Gadget-TACP.js` |
| `TACP.css` | `MediaWiki:Gadget-TACP.css` |
| `TACP-core.js` | `MediaWiki:Gadget-TACP-core.js` |
| `TACP-core.css` | `MediaWiki:Gadget-TACP-core.css` |
| `TACP-config.json` | `MediaWiki:Gadget-TACP-config.json`, **only if it does not exist yet** |
| `Gadgets-definition.txt` | Lines to add to `MediaWiki:Gadgets-definition` |
| `Gadgets-TACP.json`, `Gadgets-TACP-core.json` | `MediaWiki:Gadgets/TACP.json`, `MediaWiki:Gadgets/TACP-core.json`, for wikis using JSON definitions instead |
| `Gadget-TACP.wiki`, `Gadget-TACP.<lang>.wiki` | Preferences description, **only if missing** (see below) |
| `deploy.json` | Manifest for Litmus `gadget-deploy`: file to page, `createOnly` for the config and descriptions |
| `TACP-cdn.js`, `TACP-cdn-core.js`, `TACP-cdn-core.css`, `TACP-cdn-core.rtl.css` | None: served from jsDelivr (see [Loading from jsDelivr](#loading-from-jsdelivr)) |
| `SHA256SUMS` | Checksums of all of the above |

Each built file starts with a line naming the version and commit, so a wiki's
running version can be read from the page itself.

## Rules

- **Never overwrite `MediaWiki:Gadget-TACP-config.json`.** It belongs to the wiki.
  Create it from the release's defaults only when it is missing.
- Verify `SHA256SUMS` before writing any page: `sha256sum -c SHA256SUMS`.
- Edit summaries include the version and commit, e.g.
  `TACP v0.1.0 (abc1234)`.

## Description in preferences

Gadgets shows the message `MediaWiki:Gadget-TACP` as TACP's line in
*Special:Preferences → Gadgets*. The release ships it as these pages, `createOnly`
(a wiki's own edits are never overwritten). Litmus takes at most 8 files per
release, so `deploy.json` lists only the base page and `/vi`; create `/en` (or
another language) by hand from the release asset. The build fails if the
manifest grows past 8 files.

| File | Wiki page |
|---|---|
| `Gadget-TACP.en.wiki`, `Gadget-TACP.vi.wiki` | `MediaWiki:Gadget-TACP/en`, `/vi`: the text, from `i18n/description/` |
| `Gadget-TACP.wiki` | `MediaWiki:Gadget-TACP`: `{{MediaWiki:Gadget-TACP/{{CONTENTLANGUAGE}}}}` |

MediaWiki uses the base page for users whose language is the wiki's content
language, so the base page shows the subpage for that language; other users get
their language's subpage, or English. On a wiki whose content language has no
subpage yet, the base page shows a red link: create that subpage, or replace
the base page with text.

## Recommended bot setup

TACP does not run a central deployer and never holds credentials for anyone's
wiki. Each wiki deploys with its own bot:

1. A dedicated bot account, not a human account.
2. A BotPassword limited to the grants needed to edit sitewide CSS/JS
   ("Edit sitewide and user CSS/JS" plus "Edit existing pages" and "Create pages").
3. Interface-admin rights granted to that bot only.
4. The bot downloads the release assets, verifies `SHA256SUMS`, then writes the
   four built files (and the config page only if missing).

## Manual deployment

For wikis without a bot, an interface administrator copies the four built files
onto their pages, creates the config page if missing, and adds the gadget
definitions. The gadget definitions need the Gadgets extension; JSON config pages
need their content model to be JSON (the default for `.json` pages in the
MediaWiki namespace).

## Loading from jsDelivr

A wiki can load TACP from jsDelivr instead of installing the gadget, as scripts
on the Miraheze Developers Wiki are loaded. Each release commits its CDN files
to the `cdn` branch and adds the line to paste, with that commit, to the
release notes:

```js
// MediaWiki:Common.js (whole wiki), or Special:MyPage/common.js (yourself)
window.tacpConfig = {}; // optional settings, same keys as Gadget-TACP-config.json
mw.loader.load( 'https://cdn.jsdelivr.net/gh/songnguxyz/tacp-gadget@<commit>/TACP-cdn.js' );
```

Or as a gadget of one line: put the `mw.loader.load` line in
`MediaWiki:Gadget-TACP.js` and define it without dependencies, e.g.
`* TACP[ResourceLoader|default]|TACP.js`.

- Pin the commit from the release notes. A commit's files never change, so
  nothing reaches the wiki until someone edits that line. To update, replace
  the commit.
- To always get the latest release, load `@cdn` (the branch) instead of a
  commit. Every release, release candidates included, then reaches the wiki
  without anyone reviewing it. Each release purges jsDelivr's cache of the
  branch; if that fails, a release can take up to 12 hours to arrive, and in
  the meantime the loader and the core may come from different releases. Never
  use a tag or `@latest`: tags are not on the `cdn` branch.
- `TACP-cdn.js` (about 3 KB gzipped) loads on every page. The core and its
  styles load from the same commit the first time the palette opens; the
  right-to-left stylesheet is chosen from the page's direction, since
  ResourceLoader does not flip files it does not serve.
- Settings come from `window.tacpConfig`, set before the line; there is no
  `MediaWiki:Gadget-TACP-config.json`. Message overrides go in its `messages`.
- The wiki needs MediaWiki 1.43 or later (see the README for the support
  floor), and its Content Security Policy must allow scripts and styles from
  `cdn.jsdelivr.net`. Readers' browsers fetch the files from jsDelivr, which
  sees their IP addresses; some wikis' policies ask for that to be disclosed.
- Where the gadget or another copy already runs, the CDN build does not start.
- To try TACP without installing anything, paste the `mw.loader.load` line into
  the browser console on any wiki page.

### From wiki pages (Wikimedia wikis)

Wikimedia wikis do not allow scripts from other sites, jsDelivr included. The
same four files work from wiki pages: put `TACP-cdn.js`, `TACP-cdn-core.js`,
`TACP-cdn-core.css` and `TACP-cdn-core.rtl.css` from the release assets on
pages with those names under one prefix, e.g. `User:Example/TACP-cdn.js`, and
load the first with `action=raw`:

```js
// Special:MyPage/common.js
mw.loader.load( '//vi.wikipedia.org/w/index.php?title=User:Example/TACP-cdn.js&action=raw&ctype=text/javascript' );
```

`TACP-cdn.js` loads the other three from the same prefix, the stylesheets with
`ctype=text/css`. To update, replace all four pages with the next release's.

## Customizing

| To change | Edit |
| --- | --- |
| Settings | `MediaWiki:Gadget-TACP-config.json` (jsDelivr: `window.tacpConfig`) |
| Interface text | Its `messages` key, e.g. `{ "vi": { "tacp-placeholder": "…" } }`. `MediaWiki:Tacp-…` pages have no effect. |
| Look | `MediaWiki:Common.css`, a skin's CSS page or your own gadget, using only the classes listed in [api.md](api.md#css-classes) |
| Modes and commands | `MediaWiki:Common.js` or your own gadget, through the `tacp.register` hook ([api.md](api.md)) |

Do not edit `MediaWiki:Gadget-TACP.js`, `Gadget-TACP.css`, `Gadget-TACP-core.js`
or `Gadget-TACP-core.css`: each release overwrites them. A wiki that loads TACP
from jsDelivr through its own gadget owns that gadget's pages, whatever its name.

## SongNgư.xyz wikis (Litmus)

- The `litmus` job in `.github/workflows/release.yml` runs after the release is
  created and asks Litmus (`POST /c2c/api/gadget-releases`) for a dry-run
  `gadget-deploy` job on every wiki that accepts this repo. A person approves the
  real write on the Litmus dashboard. It needs a Cloudflare Access service token:
  the repository variable (or secret) `LITMUS_CLIENT_ID` and the secret
  `LITMUS_CLIENT_SECRET`.
- Releases tagged `vX.Y.Z-rc.N` go to hsckwiki and crwvi. Other releases go to
  every SongNgư.xyz wiki.

## Rollback

Redeploy the previous release's files from GitHub Releases through the same
path, after verifying its `SHA256SUMS`. Rollback never touches the config page.
Mark the broken release as such in `CHANGELOG.md`; do not delete it.

On the SongNgư.xyz wikis, the Litmus page of the broken release's
`gadget-deploy` job has a "Triển khai lại bản trước" button. It finds the last
release that deployed cleanly to that wiki and starts a dry run of it that leaves
`createOnly` pages (the config and the descriptions) alone; a person approves the
diff as for any release. The older release must still be on GitHub.
