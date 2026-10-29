# Changelog

All notable changes to TACP. Sections per release: Added, Changed, Deprecated,
Removed, Fixed. Every pull request that changes `src/` adds a line here.

## Unreleased

### Fixed
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
