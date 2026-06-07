---
title: Ionize
status: stable
type: feature
related: ["[[index]]"]
source:
  - .claude/skills/ionize/**
last-reviewed: 2026-06-06
---

# Ionize

Builds a knowledge graph from a corpus and renders it as an Obsidian Canvas + backing notes. Three passes, escalating in cost. **The one thing to know:** code never goes to the LLM — Pass 1 is fully local and deterministic.

## 1. Model
Normalized graph JSON — the contract every pass emits and `merge`/`to-canvas` consume. Types in `.claude/skills/ionize/src/types.ts`.

- **Node** `{ id, type, name, file?, lang?, line? }`. `type` ∈ `file | class | function | module | table | view | column | concept | media`.
- **Edge** `{ from, to, type, unresolved? }`. `type` ∈ `DECLARES | IMPORTS | CALLS | FK | JOINS | REFERENCES | MENTIONS`.
- Node `id` scheme: `file:<rel>`, `sym:<rel>#<name>@<line>`, `module:<src>`, `table:<t>`, `view:<v>`, `column:<t>.<c>`, `ref:<name>` (unresolved call, resolved in merge).

## 2. Logic
Three passes (mental model):

| Pass | Input | Engine | Cost | v1 |
|---|---|---|---|---|
| 1 — Code | source + `.sql` | tree-sitter (WASM) + node-sql-parser | free, local | **working** |
| 2 — Media | audio/video | faster-whisper (sidecar), seeded with top god-nodes | free, local | stub |
| 3 — Semantic | docs/PDF/images/transcripts | Claude subagents, parallel JSON fragments | tokens | stub |

- **Pass 1** walks the corpus deterministically (sorted, ignore set, size cap), parses code with tree-sitter `.scm` queries → declarations/imports/calls/comments; parses `.sql` deterministically → tables/views/FKs/JOINs.
- **god-nodes** = most-connected nodes; computed after Pass 1 to seed Pass 2's transcription prompt.
- **Determinism is a hard requirement.** No wall-clock timestamps; identical input → byte-identical `graph.canvas`. Layout is a banded grid (bucket by type, sort by id), never a force/random layout.
- If the corpus is only code, Pass 3 is skipped entirely.

## 3. Interface
CLI (run from `.claude/skills/ionize/`, via Bun):
- `bun run pass1 -- --root <dir> [--out graph.json] [--sql-dialect PostgreSQL]` — Pass 1 → normalized graph.
- `bun run merge -- --in <graph.json...> --out graph.merged.json` — dedup + resolve calls + union.
- `bun run canvas -- --in graph.merged.json --out-canvas <f> --out-notes <dir> [--layout type|file]` — Canvas + notes.
- `bun run ionize -- --root <dir>` — happy path: pass1 → merge → to-canvas into `graph/`.
- `pass2-media`, `pass3-semantic` — entrypoints present; exit 0 with empty fragment in v1.

## 4. Side-effects
Writes (never reads back into the LLM): `graph/graph.json`, `graph/graph.canvas`, `graph/nodes/*.md`. No network in Pass 1. `node_modules` under the skill dir (WASM grammars, no native build).

## 5. Gaps
- Pass 2 / Pass 3 are documented contracts + stubs, not implemented.
- v1 code languages: JS/JSX/TS/TSX/Python + SQL; extend via the language registry (one row + one `.scm`).
- CALLS resolved only within file/module (external calls dropped to avoid fan-out). Practical canvas ceiling ~1–2k nodes; use `--layout=file` for large corpora.
- Published as a Claude Code plugin via the vault-root marketplace (`/.claude-plugin/marketplace.json` → `source: ./.claude/skills/ionize`). The skill carries `plugin.json`, `LICENSE`, and `PUBLISHING.md`; CI lives at the vault root (`.github/workflows/validate.yml`). Install: `/plugin marketplace add zeon-kun/ionize`.
