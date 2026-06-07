# Vault

A reusable Obsidian vault that doubles as a daily-workflow standard:

- **Knowledge base** — living docs under `docs/`, cross-linked with wikilinks, kept authoritative by a doc-sync rule (see `docs/CONTRIBUTING-DOCS.md`).
- **Ionize** — a 3-pass knowledge-graph pipeline (`.claude/skills/ionize/`) that turns a codebase/corpus into an Obsidian Canvas + linked notes.

## Quick start

Open this folder as an Obsidian vault. Then build a graph:

```bash
cd .claude/skills/ionize
bun install
bun run ionize -- --root /path/to/your/code
```

Outputs land in `graph/`:
- `graph.canvas` — open in Obsidian Canvas for the visual graph.
- `nodes/*.md` — per-node notes rendered by the native Graph View.

## Ionize passes

| Pass | What | Engine | Cost | Status |
|---|---|---|---|---|
| 1 | Code structure (classes, functions, imports, calls, comments) + SQL (tables, views, FKs, JOINs) | tree-sitter (WASM) + node-sql-parser | free, local | **working** |
| 2 | Audio/video transcription, seeded with top graph concepts | faster-whisper sidecar | free, local | stub |
| 3 | Docs, papers, images | Claude subagents | tokens | stub |

Code is never sent to the LLM — Pass 1 is fully local and deterministic. See `docs/ionize.md` for the full spec and `.claude/skills/ionize/SKILL.md` for the skill contract.

## Structure

```
docs/        living docs + index (MOC)
templates/   Obsidian note templates
graph/       generated graph output
.claude/skills/ionize/   the pipeline (TypeScript, run via Bun)
```
