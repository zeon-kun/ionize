// Load ionize.config.json with sensible defaults.

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const SKILL_ROOT = path.resolve(here, '..');

export interface IonizeConfig {
  root: string;
  sqlDialect: string;
  layout: 'type' | 'file';
  maxFileBytes: number;
  ignore: string[];
}

const DEFAULTS: IonizeConfig = {
  root: '.',
  sqlDialect: 'PostgreSQL',
  layout: 'type',
  maxFileBytes: 2_000_000,
  ignore: ['node_modules', '.git', 'dist', 'build', '.next', 'out', 'vendor', '.venv', '__pycache__'],
};

export async function loadConfig(): Promise<IonizeConfig> {
  try {
    const raw = await readFile(path.join(SKILL_ROOT, 'ionize.config.json'), 'utf8');
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<IonizeConfig>) };
  } catch {
    return { ...DEFAULTS };
  }
}

// In-vault layout: skill lives at <vault>/.claude/skills/ionize.
// VAULT_ROOT is only a sane default — when ionize runs as an installed plugin the
// skill lives in a plugin cache, so callers MUST pass an explicit root (see
// resolveVaultRoot). GRAPH_DIR is retained for the intermediate-JSON scripts
// (pass1/2/3, merge) that don't emit vault-relative canvas references.
export const VAULT_ROOT = path.resolve(SKILL_ROOT, '..', '..', '..');
export const GRAPH_DIR = path.join(VAULT_ROOT, 'graph');

/** The vault that graph/ is written under and canvas `file:` refs are relative to. */
export function resolveVaultRoot(override?: string): string {
  return override ? path.resolve(override) : VAULT_ROOT;
}

/**
 * All output paths hang off ONE vault root. Because the notes dir is always
 * `<vaultRoot>/graph/nodes`, the canvas notePathPrefix is guaranteed to be the
 * vault-relative `graph/nodes` — it can never drift into a `../../` chain.
 */
export function graphPaths(vaultRoot: string) {
  const graphDir = path.join(vaultRoot, 'graph');
  return {
    graphDir,
    json: path.join(graphDir, 'graph.json'),
    merged: path.join(graphDir, 'graph.merged.json'),
    canvas: path.join(graphDir, 'graph.canvas'),
    notes: path.join(graphDir, 'nodes'),
  };
}

export { SKILL_ROOT };
