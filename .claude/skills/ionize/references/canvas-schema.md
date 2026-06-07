# Obsidian Canvas output (JSONCanvas 1.0)

Spec: jsoncanvas.org/spec/1.0. `graph.canvas` is a JSON file with `nodes` and `edges` arrays.

## Node (we emit `file` nodes backed by `nodes/*.md`)
```jsonc
{ "id": "n0", "type": "file", "file": "nodes/sym-src-db-ts-connect-12.md",
  "x": 0, "y": 0, "width": 280, "height": 80, "color": "4" }
```
- `type` ∈ `text | file | link | group`. We use `file` (each backs a markdown note) so Canvas and the native Graph View agree.
- `x y width height` are integers. `color` ∈ hex `#RRGGBB` or preset `"1"`–`"6"` (1 red, 2 orange, 3 yellow, 4 green, 5 cyan, 6 purple).

## Edge
```jsonc
{ "id": "e0", "fromNode": "n0", "toNode": "n3",
  "fromSide": "right", "toSide": "left", "label": "DECLARES", "color": "4" }
```
- `id fromNode toNode` required; `fromSide/toSide` ∈ `top|right|bottom|left`; `label`, `color` optional.

## Deterministic layout (`src/layout.ts`)
No randomness, no force sim. Banded grid:
1. Bucket nodes by `type` in fixed `TYPE_ORDER` (`file, class, function, module, table, view, column, concept, media, transcript`).
2. Within a bucket, sort by `id` (`localeCompare`).
3. Each type = a vertical column band at `x = bandIndex * (COL_W + GAP)`; node `i` in a band at `y = i * ROW_H`.
4. Color per type via a fixed map.

Identical input → identical positions → byte-identical `graph.canvas`. `--layout=file` swaps the bucket key to source file (same algorithm).

## Mapping graph → outputs (`src/to-canvas.ts`)
- Assign canvas ids `n<i>` over `graph.nodes` (already sorted by id) — stable.
- Edges become canvas edges `e<i>`; drop any with a missing endpoint.
- Each node also writes `nodes/<slug(id)>.md`:
  ```markdown
  ---
  id: "sym:src/db.ts#connect@12"
  type: function
  name: connect
  file: src/db.ts
  lang: typescript
  line: 12
  tags: [ionize]
  ---
  # connect
  `function` — declared in [[file-src-db-ts]], line 12.
  ## Edges
  - IMPORTS → [[module-pg]]
  ```
- `slug(id)` = lowercase, replace `/:#@.` and whitespace with `-`, collapse repeats. Filesystem-safe + stable. Outgoing edges become `[[wikilink]]` lines so the native Graph View links notes without opening the canvas.
