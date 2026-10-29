# TACP — The Amazing Command Palette

A MediaWiki gadget that adds a keyboard-driven command palette to every skin
except Citizen. Press **Ctrl+K** / **Cmd+K** or **/** (or tap the floating search button
on a phone) to search pages, jump to recent pages, run page actions and browse
namespaces, users, categories and page history.

- Needs only MediaWiki core and the Gadgets extension: no PHP, no extension.
- Supports every MediaWiki release mediawiki.org lists as supported
  (currently 1.43 LTS, 1.45 and 1.46).
- Built from Codex, so it looks native to the skin, night mode included.
- On by default for everyone from 1.0; users can turn it off in
  *Special:Preferences → Gadgets*. Release candidates are opt-in.
- The palette loads only when opened; the always-loaded part is about 3 KB gzipped.

## Using it

| Key | Effect |
|---|---|
| Ctrl/Cmd+K | Open or close |
| `/` | Open (outside text fields) |
| ↑ ↓ | Move the highlight |
| Enter | Open in this tab |
| Ctrl/Cmd+Enter | Open in a new tab |
| Shift+Enter | Edit the page |
| → | Reach the item's secondary actions |
| Backspace (empty input) | Leave the current mode |
| `?` | Help: list every mode |

Modes: `/ns`, `/action`, `/section` (or just `#`), `/lang` (or just `@`), `/user`,
`/category`, `/history`, `/help`.

## Installing on a wiki

See [docs/deploy.md](docs/deploy.md). Site settings live in
`MediaWiki:Gadget-TACP-config.json`:

| Key | Default | Meaning |
|---|---|---|
| `prefetch` | `false` | Load the palette during idle time on every page |
| `slashShortcut` | `true` | Whether `/` opens the palette |
| `mobileButton` | `true` | Whether the button is shown on narrow screens (not added when `searchTakeover` is on and the skin has its own phone search button) |
| `searchTakeover` | `false` | The skin's search box opens TACP instead of its own dropdown |
| `disabledModes` | `[]` | Mode ids to hide, e.g. `[ "tacp-user" ]` |
| `cargoLimit` | `50` | Row limit for Cargo queries (from v3) |
| `messages` | `{}` | Message overrides by language, e.g. `{ "vi": { "tacp-placeholder": "…" } }` |

## Extending it

Other gadgets can add modes and commands: see [docs/api.md](docs/api.md).

## Developing

```sh
npm ci
npm test        # unit tests (Vitest)
npm run lint    # ESLint + Stylelint, Wikimedia config
npm run build   # dist/: the four gadget files, config and definitions
npm run size    # size budget check
```

`dist/` is build output; never edit it or the wiki pages by hand. Every pull
request that changes `src/` adds a line to [CHANGELOG.md](CHANGELOG.md).

TACP is a clean-room implementation inspired by the Citizen skin's command
palette. Do not copy code, styles or messages from Citizen (GPL-3.0-or-later).

## Credits

Jumping to sections with `#`, switching language with `@`, and listing menu items
that other gadgets add (such as Twinkle) are ideas from the command palette user
scripts by Peter Coombe ([User:The wub](https://en.wikipedia.org/wiki/User:The_wub/commandPalette.js))
and [User:DLynch (WMF)](https://meta.wikimedia.org/wiki/User:DLynch_(WMF)/CommandPalette.js),
from the Wikimedia Hackathon 2026 project
[T425060](https://phabricator.wikimedia.org/T425060). TACP reimplements them; no code
was copied.

## License

MIT. Bundled third-party code is listed in
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
