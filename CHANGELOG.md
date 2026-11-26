# Changelog

All notable changes to TACP. Sections per release: Added, Changed, Deprecated,
Removed, Fixed. Every pull request that changes `src/` adds a line here.

## Unreleased

### Added
- `>` opens `/action`, as `#` opens `/section` and `@` opens `/lang`.
- `/action` gives each known menu link an icon for what it does (edit, history, watch, move, delete, protect, upload, print, preferences, log out and more); links added by gadgets keep the generic icon. `tacp.icons` adds the icons used.
- `TACP-user.js` and its files also load from wiki pages, as a user script on wikis that allow no scripts from other sites, such as Wikimedia's (docs/deploy.md).

### Changed
- `TACP-cdn.js`, `TACP-cdn-core.js`, `TACP-cdn-core.css` and `TACP-cdn-core.rtl.css` are renamed `TACP-user.js`, `TACP-user-core.js`, `TACP-user-core.css` and `TACP-user-core.rtl.css`. Wikis loading `@cdn` from jsDelivr change `TACP-cdn.js` to `TACP-user.js` in their line; lines pinned to an older commit keep working.
- The console line says `TACP-user.js` instead of jsDelivr, since that build may come from wiki pages.

### Fixed
- A result row kept the thumbnail of the page shown there before, when typing changed the results.

## 0.1.0-rc.13 — 2026-11-25

### Added
- Spanish messages, by PretzelBubbleTea.

### Changed
- Every `i18n/<lang>.json` is bundled: a new language file needs no code change. The loaders' size budget rises from 4 KB to 6 KB gzipped to carry their messages in every language.

## 0.1.0-rc.12 — 2026-11-24

### Fixed
- The `/ns` description no longer logs a jqueryMsg parse error for `{{`.
- `/user` shows UserProfileV2 avatars and "about me"; it read the API's answer as an object, not a list.
- Result icons sit in a 40px square, like thumbnails; they were 40px wide and only as tall as the icon.

### Added
- `docs/deploy.md` says where a wiki changes TACP's settings, text, look and modes.
- `docs/api.md` lists the CSS classes wikis may style; they change only in a major release.
- A line in the browser console says TACP is running, with its version and whether it came from the gadget or jsDelivr.

## 0.1.0-rc.11 — 2026-11-24

### Added
- Modes take an optional `icon`, shown in `/help`; each built-in mode has its own. `tacp.icons` adds `code`, `info` and `linkExternal`.
- `/user` shows UserProfileV2 avatars and "about me" when the extension is installed.
- `/about`: version, source code, issue tracker, API documentation and credits.

### Fixed
- Comments in the Vue templates no longer appear in the page's HTML.

## 0.1.0-rc.10 — 2026-11-24

### Added
- Loading `@cdn` from jsDelivr gets the latest release; each release purges jsDelivr's cache of it (docs/deploy.md).
- A logo and a banner, in `docs/brand/`.

### Changed
- Internal simplifications (siteinfo no longer fetches namespaces, Recent stores titles only); no change in behaviour.
- Results that open a page are links: right-click, long-press or middle-click them to copy the address or open it in a new tab.

### Removed
- The "Copy link" action on page results; the link's own menu does it.

### Fixed
- `TACP-cdn.js` loaded from a gadget named `TACP` did nothing: it took that gadget for TACP already running. Pasted into the console, it now says to use `mw.loader.load` instead of loading the core from the wiki.

## 0.1.0-rc.9 — 2026-11-22

### Added
- `TACP-cdn.js` and its files, committed by each release to the `cdn` branch: load TACP from jsDelivr with one line, settings in `window.tacpConfig` (docs/deploy.md).
- `{{` opens a template search, like `Template:`; a closing `}}` is ignored.

### Changed
- Built for ES2018, the level of the browsers MediaWiki 1.43 runs JavaScript on.
- Result thumbnails load only when their row scrolls into view. Related pages ask for 40px × the screen's pixel ratio; on screens where a search thumbnail has too few pixels, a sharper one is fetched through PageImages for the rows in view, one request per batch.
- The highlighted result has a bar at its start edge, and an outline in forced-colors (high contrast) mode, where it was invisible; the line under the search input shows its focus.
- Screen readers hear how to use the palette, the number of results, and the secondary action chosen with → (actions are no longer exposed as buttons inside options, where they were not read).

### Removed
- `TACP-standalone.js`: to try TACP from the console, paste the one `mw.loader.load` line of `TACP-cdn.js` instead.

### Fixed
- Keys pressed while the palette first loads: Enter (also with Ctrl/Cmd or Shift) opens the first result for the typed text; Escape or the shortcut again cancels opening. They no longer reach the page.
- Searching no longer fails on Chrome 63–65 and Safari 11.1–12.0, which have no AbortController.
- Spacing in the palette no longer collapses on browsers without flex `gap` (Safari before 14.1, Chrome before 84).
- The mode chip's padding is mirrored in right-to-left languages.

## 0.1.0-rc.8 — 2026-11-12

### Added
- `TACP-standalone.js` release asset: paste it into the browser console to try
  TACP on any wiki without installing the gadget.

## 0.1.0-rc.7 — 2026-10-30

### Changed
- Only the Vietnamese description (`MediaWiki:Gadget-TACP/vi`) is deployed with
  the base page: Litmus takes at most 8 files per release. The English text is
  still a release asset (`Gadget-TACP.en.wiki`) for wikis to create by hand.

## 0.1.0-rc.6 — 2026-10-30

Never deployed: Litmus rejected its `deploy.json` (9 files, limit 8).

### Added
- The release deploys the preferences description (`MediaWiki:Gadget-TACP` and
  its `/en` and `/vi` subpages) when the wiki does not have it yet.

## 0.1.0-rc.5 — 2026-10-29

Never deployed: its Litmus dry run was stopped in favour of rc.6, which carries
the same changes.

### Added
- CI runs browser tests (Playwright) against a real MediaWiki 1.43 and 1.46,
  on Vector 2022 and Minerva.
- `docs/deploy.md` has the preferences description for `MediaWiki:Gadget-TACP`,
  in English and Vietnamese.
- Typing a namespace name and a colon (`Template:`, `Bản mẫu:`, `Đặc biệt:`, or
  an alias the wiki defines) turns it into a chip and searches only that
  namespace; special pages match any of their aliases. `/ns` lists Special too. Inside a
  namespace search, "Go to" and "Create or edit" work for the typed title.

### Fixed
- Keys typed while the palette loads for the first time in a page view (e.g.
  Ctrl+K then typing straight away) now go into the palette instead of being lost.
- A mode with nothing to list and nothing typed (e.g. `@` on a page with no
  other languages) said “Nothing matches "".”; it now says the mode has nothing
  to show for this page.
- `/history` no longer ends a revision with “ · ” when its user is hidden.
- Result groups without a heading, and items without a label, from other
  gadgets' modes no longer render as empty rows.
- Vietnamese: category size reads “$1 mục” (entries), not “thành viên”, which
  means users on Vietnamese wikis.

## 0.1.0-rc.4 — 2026-10-29

### Added
- `/section` mode (shortcut `#`): jump to a heading of the page, numbered like
  the table of contents, with DiscussionTools' comment summary on talk pages.
- `/lang` mode (shortcut `@`): the page in other languages, from the skin's
  links or, on Minerva, the API.
- `/action` lists every menu link, grouped by menu, including menus other
  gadgets add (such as Twinkle). Languages moved to `/lang`.
- These three follow ideas from the command palette user scripts by Peter
  Coombe (User:The wub) and User:DLynch (WMF), Wikimedia Hackathon 2026
  (T425060). No code was copied.

### Changed
- Search takeover also catches Vector 2022's sticky header search box and
  Minerva's search triggers by class. When it is on and the skin has its own
  phone search button, TACP's floating button is not added.

## 0.1.0-rc.3 — 2026-10-28

### Added
- Search takeover (`searchTakeover`, off by default): the skin's search box, and
  Minerva's or Vector 2022's search buttons, open the palette instead.
- CirrusSearch: "In page text" full-text results with snippets, and its
  "Did you mean" suggestion, while typing.

### Changed
- A result whose title (or a redirect to it) matches the query exactly comes
  first, so Enter goes there like the skin search box does.

### Fixed
- Mobile button icon is now a magnifier with a sparkle; the old top hat read as
  a knob. Its tooltip shows the keyboard shortcut and it sets `aria-keyshortcuts`.

## 0.1.0-rc.2 — 2026-10-27

Same gadget code as 0.1.0-rc.1, which never reached Litmus.

### Changed
- Release workflow reads `LITMUS_CLIENT_ID` from a repository variable and fails
  with a clear message when the Access token is missing.

## 0.1.0-rc.1 — 2026-10-27

First release candidate. The gadget is opt-in (no `default` flag) while it is
tested on hsckwiki.

### Added
- Loader gadget `TACP`: Ctrl/Cmd+K and `/` shortcuts, mobile button on narrow
  viewports, optional idle prefetch, site configuration page.
- Core gadget `TACP-core`: command palette built on Codex, with title search,
  recent items, related pages, commands and query actions.
- Modes `/ns`, `/action`, `/user`, `/category`, `/history` and `/help`.
- Public API (`apiVersion` 1) through the `tacp.register` hook.
- English and Vietnamese messages.
- Release workflow: `deploy.json` manifest and a Litmus `gadget-deploy` dry run per release.
