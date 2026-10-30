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
| `SHA256SUMS` | Checksums of all of the above |

Each built file starts with a line naming the version and commit, so a wiki's
running version can be read from the page itself.

## Rules

- **Never overwrite `MediaWiki:Gadget-TACP-config.json`.** It belongs to the wiki.
  Create it from the release's defaults only when it is missing.
- **Verify `SHA256SUMS`** before writing any page: `sha256sum -c SHA256SUMS`.
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

## SongNgư.xyz wikis (Litmus)

- The `litmus` job in `.github/workflows/release.yml` runs after the release is
  created and asks Litmus (`POST /c2c/api/gadget-releases`) for a dry-run
  `gadget-deploy` job on every wiki that accepts this repo. A person approves the
  real write on the Litmus dashboard. It needs a Cloudflare Access service token:
  the repository variable (or secret) `LITMUS_CLIENT_ID` and the secret
  `LITMUS_CLIENT_SECRET`.
- Releases tagged `vX.Y.Z-rc.N` go to hsckwiki only (and to publictestwiki.com
  once Miraheze grants Litmus's bot interface-admin rights there; until then they
  are copied by hand). Other releases go to every SongNgư.xyz wiki.

## Rollback

Redeploy the previous release's files from GitHub Releases through the same
path, after verifying its `SHA256SUMS`. Rollback never touches the config page.
Mark the broken release as such in `CHANGELOG.md`; do not delete it.
