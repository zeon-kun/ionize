// Pass 1 — local, free code graph. Walk corpus, parse with tree-sitter + node-sql-parser,
// emit normalized graph.json. The only working pass in v1.

import path from 'node:path';
import { parseArgs } from 'node:util';
import { loadConfig, GRAPH_DIR } from '../src/config.ts';
import { runPass1 } from '../src/passes.ts';
import { saveGraph } from '../src/graph-io.ts';

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      root: { type: 'string' },
      out: { type: 'string' },
      'sql-dialect': { type: 'string' },
    },
  });

  const cfg = await loadConfig();
  const root = path.resolve(values.root ?? cfg.root);
  const out = path.resolve(values.out ?? path.join(GRAPH_DIR, 'graph.json'));

  const { graph, stats } = await runPass1({
    root,
    dialect: values['sql-dialect'] ?? cfg.sqlDialect,
    ignore: new Set(cfg.ignore),
    maxBytes: cfg.maxFileBytes,
  });
  await saveGraph(out, graph);

  process.stderr.write(
    `Pass 1: ${stats.codeFiles} code + ${stats.sqlFiles} sql files → ${graph.nodes.length} nodes, ${graph.edges.length} edges` +
      (stats.sqlSkipped ? ` (${stats.sqlSkipped} sql statements skipped)` : '') +
      `\n  → ${out}\n`,
  );
}

main().catch((err) => {
  process.stderr.write(`pass1-code failed: ${err?.stack ?? err}\n`);
  process.exit(1);
});
