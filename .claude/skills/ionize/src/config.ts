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
export const VAULT_ROOT = path.resolve(SKILL_ROOT, '..', '..', '..');
export const GRAPH_DIR = path.join(VAULT_ROOT, 'graph');

export { SKILL_ROOT };
