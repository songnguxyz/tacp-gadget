# Changelog

All notable changes to TACP. Sections per release: Added, Changed, Deprecated,
Removed, Fixed. Every pull request that changes `src/` adds a line here.

## Unreleased

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
