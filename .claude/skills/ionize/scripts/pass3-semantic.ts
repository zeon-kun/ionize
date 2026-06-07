// Pass 3 — semantic extraction over docs/papers/images via Claude subagents. STUB in v1.
//
// Contract (see references/workflow.md):
//   - Input: .md .pdf + images + transcripts. NEVER code files.
//   - If the corpus is code-only, this pass is skipped entirely.
//   - Batch files; run Claude subagents in parallel. Each returns a JSON fragment:
//       { nodes: [{id:"concept:...",type:"concept",name}], edges:[{from,to,type:"REFERENCES"}], groups?:[...] }
//   - Merge fragments into the graph.
//
// v1 writes an empty fragment and exits 0.

import path from 'node:path';
import { parseArgs } from 'node:util';
import { GRAPH_DIR } from '../src/config.ts';
import { saveGraph } from '../src/graph-io.ts';
import { GRAPH_VERSION } from '../src/types.ts';

async function main(): Promise<void> {
  const { values } = parseArgs({ options: { root: { type: 'string' }, out: { type: 'string' } } });
  const root = path.resolve(values.root ?? '.');
  const out = path.resolve(values.out ?? path.join(GRAPH_DIR, 'graph.semantic.json'));

  process.stderr.write('Pass 3 (semantic extraction) is not implemented in v1 — writing empty fragment.\n');
  await saveGraph(out, { version: GRAPH_VERSION, source: root, nodes: [], edges: [] });
  process.stderr.write(`  → ${out}\n`);
}

main().catch((err) => {
  process.stderr.write(`pass3-semantic failed: ${err?.stack ?? err}\n`);
  process.exit(1);
});
