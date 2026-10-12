# Design Tokens Toy

A minimal, runnable copy of the tokens.json -> CSS mechanism from the production
project (`web/ui/tokens` there), using [Style Dictionary](https://styledictionary.com/).

## Run it

```
npm install
npm run build        # writes dist/tokens.css from tokens.json
```

Then open `index.html` in a browser (or re-run the build and refresh) to see
the generated custom properties in use, including the dark-mode block.

## How it fits together

- **`tokens.json`** — source of truth, in [DTCG format](https://design-tokens.github.io/community-group/format/).
  Each token has a `$value`, a `$type`, and a `$extensions["com.toy.css"].name`
  that records its own CSS custom property name. That name is independent of
  the token's JSON path, so you can reorganize/rename groups in the JSON
  without ever renaming a `var()` already used in CSS.
- **Aliases** — a token's `$value` can be `"{color.blue.500}"`, a reference to
  another token by path. Style Dictionary resolves these and fails the build
  if one points nowhere. `semantic.light.brand` points at `color.blue.500`;
  `semantic.dark.brand` points at `color.blue.400` — same CSS variable name
  (`--color-brand`) in both cases, different palette token behind it.
- **`build.mjs`** — registers a custom Style Dictionary format (`toy/css`)
  that walks a small config of CSS blocks (selector + filter function) and
  writes each matching token as `--name: value;`, resolving an alias to
  `var(--other-name)` rather than inlining its value. Here there are two
  blocks in one file: `:root` (palette + light semantic aliases) and
  `:root[data-theme='dark']` (dark semantic aliases, same names, override
  via the cascade).
- **`dist/tokens.css`** — generated output. Never hand-edit it; edit
  `tokens.json` and rebuild.

## Editing in Figma, then re-running

Figma doesn't speak this JSON format natively from its UI, but Figma
Variables can be exported/imported as DTCG-flavored JSON through:

- a plugin such as **Tokens Studio for Figma** (import/export JSON, can be
  pointed at a GitHub repo for two-way sync), or
- Figma's own Variables REST API, which can import/export in a
  DTCG-compatible shape.

Caveat to check after any Figma round-trip: the `$extensions["com.toy.css"]`
block (the literal `--css-name`) is not a standard DTCG field, and most
Figma tooling won't know to preserve it since it's custom to this setup. If a
re-exported `tokens.json` is missing those names, either:
- add the `$extensions` block back by hand for any new/renamed tokens, or
- use Tokens Studio's token name as the source and change `cssName()` in
  `build.mjs` to derive `--the-token-name` from `token.path.join('-')`
  instead of reading `$extensions` (simpler, but then renaming a Figma
  token/group also renames its CSS variable).

Workflow once that's sorted:

1. Edit variables in Figma.
2. Export/sync variables to `tokens.json` in this folder (overwrite it).
3. `npm run build`.
4. Refresh `index.html` (or reload your real app) to see the new values.
