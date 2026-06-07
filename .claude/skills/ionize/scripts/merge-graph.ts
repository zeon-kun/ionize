// Merge pass fragments: dedupe nodes, resolve `ref:` CALLS within file,
// drop dangling edges, union + sort. Writes graph.merged.json.

import path from 'node:path';
import { parseArgs } from 'node:util';
import { GRAPH_DIR } from '../src/config.ts';
import { loadGraph, saveGraph } from '../src/graph-io.ts';
import { mergeGraphs } from '../src/merge.ts';

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      in: { type: 'string', multiple: true },
      out: { type: 'string' },
    },
  });

  const inputs = (values.in && values.in.length ? values.in : [path.join(GRAPH_DIR, 'graph.json')]).map((p) =>
    path.resolve(p),
  );
  const out = path.resolve(values.out ?? path.join(GRAPH_DIR, 'graph.merged.json'));

  const graphs = [];
  for (const file of inputs) graphs.push(await loadGraph(file));

  const { graph, dropped } = mergeGraphs(graphs);
  await saveGraph(out, graph);

  process.stderr.write(
    `Merge: ${inputs.length} input(s) → ${graph.nodes.length} nodes, ${graph.edges.length} edges (${dropped} edges dropped/unresolved)\n  → ${out}\n`,
  );
}

main().catch((err) => {
  process.stderr.write(`merge-graph failed: ${err?.stack ?? err}\n`);
  process.exit(1);
});
