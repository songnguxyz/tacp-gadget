# Third-party notices

TACP bundles the following third-party code in its built files.

## Codex icons

Package: `@wikimedia/codex-icons` 1.14.0 (only the icon paths TACP uses, in `TACP-core.js`)

```
MIT License

Copyright (c) 2011-2022 Wikimedia Design & OOUI team and other contributors.

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```

## Not bundled

- **Vue** and **Codex components** (`@wikimedia/codex`, GPL-2.0+) are served by MediaWiki core through ResourceLoader and loaded with `require()`. They are not part of TACP's files.
- **Codex design tokens** (`@wikimedia/codex-design-tokens`, GPL-2.0+) are not a dependency. `src/styles/tokens.less` only names the tokens as CSS custom properties, with hand-written fallback values.
