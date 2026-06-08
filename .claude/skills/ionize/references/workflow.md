# Workflow — the 3-pass pipeline

Run order: `pass1 → (pass2) → (pass3) → merge → to-canvas`. Each pass writes a `{nodes,edges}` fragment; merge unions them; to-canvas renders once.

## Pass 1 — Code structure (working)
Local, free, no LLM. `scripts/pass1-code.ts`:
1. Load `ionize.config.json` (root, sqlDialect, ignore, maxFileBytes).
2. `walk(root)` — sorted, ignore set, size cap (deterministic order).
3. Per file: `detectLanguage(path)`.
   - `code` → tree-sitter parse + `.scm` query → `extractCode` → nodes/edges.
   - `sql` → `node-sql-parser` → `extractSql` → nodes/edges.
   - `skip` → ignore.
4. Concatenate fragments, sort, write `graph.json`.
See `pass1-code-graph.md`, `sql-extraction.md`.

## Pass 2 — Audio/video (stub)
Local, free. `scripts/pass2-media.ts`. **Contract for the future implementation:**
- Input: media files (`.mp3 .wav .m4a .mp4 .mov .mkv …`) under root.
- Seed the faster-whisper prompt with the **top god-nodes** — the highest-degree nodes from the current `graph.json` (compute degree = in+out edges, take top N names). This focuses transcription on the project's vocabulary.
- Cache transcripts next to media (hash-keyed); re-runs skip processed files.
- Emit: `media:<rel>` / `transcript:<rel>` nodes; `MENTIONS` edges from transcript → existing node when a god-node name appears.
- v1: prints "Pass 2 not implemented" and writes an empty fragment (`{nodes:[],edges:[]}`), exit 0.

## Pass 3 — Docs/papers/images (stub)
Costs tokens. `scripts/pass3-semantic.ts`. **Contract:**
- Input: `.md .pdf` + images + transcripts. **Never code files.** If the corpus is code-only, this pass is skipped entirely.
- Batch files; run Claude subagents in parallel. Each subagent reads its batch and returns a JSON fragment: `{ nodes: [{id:"concept:…",type:"concept",name}], edges: [{from,to,type:"REFERENCES"}], groups?: [...] }`.
- Merge fragments into the graph.
- v1: prints "Pass 3 not implemented" and writes an empty fragment, exit 0.

## Merge — `scripts/merge-graph.ts`
- Read one or more fragment files (`--in a.json b.json …`).
- Dedup nodes by `id` (first wins; later fragments may enrich missing fields).
- Resolve `CALLS` edges whose `to` is `ref:<name>`: match to a declared symbol with that `name` in the same file (then same module); drop if unresolvable (avoids external-call fan-out).
- Union edges; drop edges with a dangling endpoint. Sort. Write `graph.merged.json`.

## Render — `scripts/to-canvas.ts`
- `layout(graph)` → deterministic positions (banded grid by type, sorted by id).
- Write `graph.canvas` (JSONCanvas 1.0) + `nodes/<slug>.md` (frontmatter + `[[wikilink]]` edges).
- Canvas `file:` refs are vault-relative. The base is `--vault` (default: skill's in-vault root); `--out-notes` outside that vault is rejected rather than emitting a broken `../` ref.
See `canvas-schema.md`.

## Dispatcher — `scripts/ionize.ts`
Happy path for a code corpus: `pass1 → merge → to-canvas`, writing a `graph/` dir under the output vault root. The output root defaults to `--root` (the scanned dir); pass `--out <vault>` to redirect. Pass 2/3 are opt-in (`--media`, `--semantic`) and no-ops in v1.
