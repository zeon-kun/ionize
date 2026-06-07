# Vault — Agent Guide

This is a reusable Obsidian vault: a knowledge base + the `ionize` knowledge-graph pipeline. It is the daily-workflow standard, so keep it clean, deterministic, and token-light.

## Rules
- **Docs are source of truth.** Follow [[CONTRIBUTING-DOCS]]: any change touching a doc's `source:` paths updates that doc in the same change. No "TODO update docs".
- **Determinism.** Generated artifacts (`graph/*`) must be reproducible — identical input → byte-identical output. Never introduce wall-clock timestamps or randomness into the pipeline.
- **Token discipline.** Bullets/tables over prose. Frontmatter declares scope. Wikilinks over URLs.
- **Code never goes to the LLM in Pass 1.** It is local tree-sitter parsing only.
- **Commit messages:** no `Co-Authored-By` trailers; concise and imperative.

## Layout
- `docs/` — living docs (`index.md` is the MOC).
- `templates/` — `living-doc.md`, `node.md`.
- `graph/` — generated output (`graph.canvas` + `nodes/*.md`).
- `.claude/skills/ionize/` — the pipeline (self-contained, TS, run via Bun).

## Running ionize
```bash
cd .claude/skills/ionize
bun install                              # WASM grammars, no native build
bun run ionize -- --root <target-dir>  # → ../../../graph/{graph.canvas,nodes/}
```
Full spec: [[ionize]] and `.claude/skills/ionize/SKILL.md`.
