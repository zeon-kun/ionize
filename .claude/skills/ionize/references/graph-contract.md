# Graph contract

Every pass emits this shape. `merge-graph` unions fragments; `to-canvas` is the only consumer that renders. Defined in `src/types.ts`.

```ts
interface Graph {
  version: number;            // 1
  source: string;             // absolute root that was scanned
  nodes: GraphNode[];
  edges: GraphEdge[];
}
interface GraphNode {
  id: string;                 // stable, scheme below
  type: 'file' | 'class' | 'function' | 'module'
      | 'table' | 'view' | 'column'
      | 'concept' | 'media' | 'transcript';
  name: string;
  file?: string;              // relative path
  lang?: string;
  line?: number;              // 1-based
  doc?: string;               // nearest preceding comment, trimmed
}
interface GraphEdge {
  from: string;               // node id
  to: string;                 // node id (or ref:<name> until merge resolves it)
  type: 'DECLARES' | 'IMPORTS' | 'CALLS' | 'FK' | 'JOINS' | 'REFERENCES' | 'MENTIONS';
  unresolved?: boolean;       // true for ref:<name> CALLS targets pre-merge
}
```

## Node id scheme (deterministic)
| Kind | id |
|---|---|
| file | `file:<rel>` |
| class / function / method | `sym:<rel>#<name>@<line>` |
| imported module | `module:<source>` |
| table | `table:<name>` |
| view | `view:<name>` |
| column | `column:<table>.<col>` |
| unresolved call target | `ref:<name>` (only pre-merge) |
| concept (Pass 3) | `concept:<slug>` |
| media/transcript (Pass 2) | `media:<rel>` / `transcript:<rel>` |

## Invariants
- **No `generatedAt` / timestamps.** Determinism is enforced; identical input → identical output bytes.
- Node ids are unique; on collision during merge, first wins.
- An edge may reference a `ref:` id only before merge. After merge, every edge endpoint resolves to a real node or the edge is dropped.
- Arrays are emitted in a stable order (nodes sorted by id, edges by `from,to,type`) so JSON is reproducible.
