---
name: ionize
description: Use this skill when the user wants to build a knowledge graph from a codebase or mixed corpus and view it in Obsidian — e.g. "ionize this repo," "map the code structure," "build a knowledge graph from these files," "visualize the call graph / schema relationships," or "extract the concepts from these docs into a graph." Runs a 3-pass pipeline (Pass 1 code via tree-sitter + SQL, local & free; Pass 2 audio/video via faster-whisper; Pass 3 docs/papers/images via Claude subagents) and emits an Obsidian Canvas plus per-node markdown notes. Do NOT use to write application code or refactor — this skill only produces a graph. Output is always graph.json + graph.canvas + nodes/*.md.
license: Internal
---

# Ionize

Turn a corpus into a knowledge graph rendered as an Obsidian Canvas + linked notes. Faithful, deterministic, and cost-staged: the cheap local passes run first, the LLM pass runs only on the files that need it.

## When to use this skill
- "Ionize this repo" / "map the code structure of X"
- "Build a knowledge graph from these files"
- "Visualize the call graph" / "show the schema relationships in this SQL"
- "Extract the concepts from these docs into a graph" (Pass 3)

## When NOT to use this skill
- **Writing or refactoring application code.** This skill produces a graph, not code changes.
- **A single lookup.** If the user wants one function's callers, grep — don't build the whole graph.
- **Sending source code to an LLM.** Code files never go to the semantic extractor; Pass 1 is local-only by design.

## Non-negotiables
These are the rules. Violations make the output wrong or non-reproducible.

1. **Determinism.** Identical input → byte-identical `graph.canvas`. No wall-clock timestamps, no randomness, no force-layout. The corpus walk is sorted; layout is a banded grid keyed on type + id. Verify by running twice and diffing.
2. **Code never reaches the LLM.** Pass 1 (tree-sitter + node-sql-parser) is fully local. If the corpus is only code, Pass 3 is skipped entirely. Semantic extraction (Pass 3) is reserved for docs, papers, images, and transcripts.
3. **Every pass emits the same contract.** Normalized `{ nodes, edges }` (see `references/graph-contract.md`). `merge-graph` unions pass outputs; `to-canvas` is the only renderer.
4. **SQL is deterministic, not LLM-guessed.** Tables, views, foreign keys, and JOINs are parsed from the AST (`node-sql-parser`), never inferred.
5. **Extensibility over breadth.** Languages live in a registry — adding one is a row + a `.scm` query file, never edits to the extractor. Don't hard-code language logic into the pipeline.
6. **Fail loud, early.** Validate each `.scm` query compiles at startup. Skip an unparseable SQL statement (count it), but never abort the whole file silently.

## Workflow
Run passes in order; each writes a `{nodes,edges}` fragment, then merge + render.

**Pass 1 — Code structure (local, free).** Walk the corpus deterministically. Detect language by extension via the registry. Parse code with tree-sitter `.scm` queries → classes, functions, imports, call graph, comments. Parse `.sql` with `node-sql-parser` → tables, views, foreign keys, JOIN relationships. Emit `graph.json`. **This is the only working pass in v1.** See `references/pass1-code-graph.md` and `references/sql-extraction.md`.

**Pass 2 — Audio/video (local, free) — STUB.** Transcribe media with faster-whisper, seeding the prompt with the current top god-nodes (most-connected concepts so far). Cache transcripts; re-runs skip processed files. Emit `media`/`transcript` nodes + `MENTIONS` edges. Entrypoint present; exits 0 with an empty fragment in v1. Contract in `references/workflow.md`.

**Pass 3 — Docs/papers/images (Claude subagents, costs tokens) — STUB.** Run Claude in parallel over markdown/PDF/images/transcripts. Each subagent reads a batch and returns a JSON fragment (nodes, edges, groups); fragments merge into the graph. Skipped entirely for code-only corpora. Entrypoint present; exits 0 with an empty fragment in v1. Contract in `references/workflow.md`.

**Merge.** `merge-graph` dedups nodes by id (first wins), resolves unresolved `ref:` CALLS targets to declared symbols within the same file/module (drops the rest to avoid fan-out), and unions edges.

**Render.** `to-canvas` lays out nodes with a deterministic banded grid and writes `graph.canvas` (JSONCanvas 1.0) + `nodes/*.md` (YAML frontmatter + `[[wikilink]]` edges). The canvas and the wikilink graph are two renderings of the same data.

## Outputs
Written to a `graph/` directory under the **output vault root** (never read back into the LLM):
```
graph/
├── graph.json       ← normalized {nodes, edges} from Pass 1 (+ later passes)
├── graph.canvas     ← JSONCanvas 1.0 — open in Obsidian Canvas
└── nodes/*.md       ← per-node notes, linked by [[wikilinks]] for the Graph View
```
The output root defaults to `--root` (the scanned dir), so canvas `file:` refs stay vault-relative (`graph/nodes/…`) and the graph lands in the codebase you scanned — not the plugin cache the skill installs into. Override with `--out <vault>` to scan one tree and write the graph into another (e.g. your Obsidian vault).

CLI lives in this skill dir; run with **Bun** (`.ts` runs natively, no build step — see `package.json` scripts). Happy path: `bun run ionize -- --root <dir>` (add `--out <vault>` to redirect output).

## Reading order
When this skill is loaded, read in this order:
1. This file (you're here)
2. `references/workflow.md` — the 3-pass pipeline, run order, Pass 2/3 contracts
3. `references/graph-contract.md` — the normalized `{nodes,edges}` shape (the spine)
4. `references/pass1-code-graph.md` — tree-sitter approach, language registry, capture vocabulary
5. `references/sql-extraction.md` — node-sql-parser → tables/views/FK/JOIN mapping
6. `references/canvas-schema.md` — JSONCanvas 1.0 + the deterministic layout

## Marketplace plugin
This directory **is** the ionize plugin and also runs in-place as a project skill. The vault repo hosts it as a marketplace — the marketplace manifest lives at the **vault root** (`.claude-plugin/marketplace.json`, `source: ./.claude/skills/ionize`), not here:
- `.claude-plugin/plugin.json` — plugin manifest (name, version, author, license, keywords); what `/plugin install` reads.
- `scripts/validate.sh` (`bun run validate`) — validates this plugin: JSON parses, `SKILL.md` frontmatter, `plugin.json` fields.
- `LICENSE` (MIT), `PUBLISHING.md` — the publish + local-install steps.

Install: `/plugin marketplace add zeon-kun/ionize` → `/plugin install ionize@ionize`. Full steps in `PUBLISHING.md`.
