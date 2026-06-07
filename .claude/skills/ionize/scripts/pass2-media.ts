// Pass 2 — audio/video transcription (faster-whisper). STUB in v1.
//
// Contract (see references/workflow.md):
//   - Walk media files under root (.mp3 .wav .m4a .mp4 .mov .mkv ...).
//   - Seed the whisper prompt with the top god-nodes (highest-degree nodes in graph.json)
//     so transcription is biased toward the project's vocabulary.
//   - Cache transcripts (hash-keyed); skip already-processed files on re-runs.
//   - Emit `media:<rel>` / `transcript:<rel>` nodes + `MENTIONS` edges to existing nodes.
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
  const out = path.resolve(values.out ?? path.join(GRAPH_DIR, 'graph.media.json'));

  process.stderr.write('Pass 2 (media transcription) is not implemented in v1 — writing empty fragment.\n');
  await saveGraph(out, { version: GRAPH_VERSION, source: root, nodes: [], edges: [] });
  process.stderr.write(`  → ${out}\n`);
}

main().catch((err) => {
  process.stderr.write(`pass2-media failed: ${err?.stack ?? err}\n`);
  process.exit(1);
});
