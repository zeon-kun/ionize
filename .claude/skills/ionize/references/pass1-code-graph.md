# Pass 1 — code graph (tree-sitter)

## Engine
`web-tree-sitter` (WASM) + `tree-sitter-wasms` (prebuilt grammars). No native build — portable on WSL2. The runtime `tree-sitter.wasm` ships inside `web-tree-sitter`; grammars are `<pkg>/out/tree-sitter-<lang>.wasm` in `tree-sitter-wasms`.

**Version pinning (load-bearing).** `tree-sitter-wasms@0.1.13` grammars are built with `tree-sitter-cli@0.20.x` (ABI 14). `web-tree-sitter@0.26` expects a newer ABI and fails to load them (`getDylinkMetadata` error). So **pin `web-tree-sitter@^0.22.6`** — the line that reads ABI-14 grammars. If you bump either dependency, re-verify the pairing.

API (web-tree-sitter 0.22 — default `export =`, namespaced types, queries via `language.query()`):
```ts
import Parser from 'web-tree-sitter';                 // default export is the Parser class
await Parser.init();
const lang = await Parser.Language.load(wasmPath('tree-sitter-python.wasm'));
const parser = new Parser(); parser.setLanguage(lang);
const tree = parser.parse(source);
const query = lang.query(scmString);                  // NOT `new Query(...)`
for (const m of query.matches(tree.rootNode)) { /* m.captures: {name,node}[] */ }
// types: Parser.SyntaxNode, Parser.Query, Parser.QueryMatch, Parser.QueryCapture
```
Node: `.type .text .startPosition{row,column} .parent .id .childForFieldName(name)`.

> Run with **Bun** (`bun scripts/*.ts`) — it executes `.ts` natively, no build step. tsconfig still needs `allowImportingTsExtensions` + `rewriteRelativeImportExtensions` so `tsc --noEmit` (typecheck) and the optional `tsc` build accept the `.ts` import specifiers.

## Language registry (`src/registry.ts`)
Single source of truth mapping extension → grammar + query. Adding a language = one row + one `.scm`. v1 ships JS/JSX/TS/TSX/Python; SQL is handled out-of-band (see `sql-extraction.md`).

```ts
LANGUAGES = {
  javascript: { exts: ['.js','.jsx','.mjs','.cjs'], wasm: 'tree-sitter-javascript.wasm', scm: 'javascript.scm' },
  typescript: { exts: ['.ts','.cts','.mts'],         wasm: 'tree-sitter-typescript.wasm', scm: 'typescript.scm' },
  tsx:        { exts: ['.tsx'],                       wasm: 'tree-sitter-tsx.wasm',        scm: 'typescript.scm' },
  python:     { exts: ['.py','.pyi'],                 wasm: 'tree-sitter-python.wasm',     scm: 'python.scm' },
}
```
`wasmPath` resolves via `createRequire(import.meta.url).resolve('tree-sitter-wasms/package.json')` → `out/<file>`.

## Capture vocabulary (`.scm` files)
Keep capture names identical across languages so `extractCode` is language-agnostic. One pattern per construct:
- `@definition.class` + `@name.class`
- `@definition.function` / `@definition.method` + `@name.function`
- `@import` + `@import.source` (module string, quotes stripped)
- `@call` + `@call.name`
- `@comment`

`extractCode` uses `query.matches()` so each match groups a definition with its name. Validate every query at startup (`new Query(lang, scm)` throws on a bad node type → fail loud).

## Extraction → nodes/edges
- `file:<rel>` node per file.
- Each definition → `class`/`function` node `sym:<rel>#<name>@<line>` + `DECLARES` edge from file. A `@comment` ending on the line above a definition attaches as `doc`.
- Each import → `module:<src>` node + `IMPORTS` edge from file.
- Each call → `CALLS` edge from the **enclosing definition** (walk `node.parent` until a captured definition; else the file) to `ref:<name>` (`unresolved: true`). Merge resolves these within file/module.
