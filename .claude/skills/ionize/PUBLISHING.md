# Publishing ionize as a marketplace plugin

This directory is a **self-contained Claude Code plugin** (single-skill, `SKILL.md` at the plugin root) that also works in-place as a project skill. It's already prepared — publishing is just pushing it to a repo.

## Layout (already in place)
```
ionize/                       ← plugin root
├─ .claude-plugin/
│  ├─ plugin.json             ← plugin manifest
│  └─ marketplace.json        ← self-hosted marketplace (source: "./")
├─ SKILL.md                   ← the skill (root single-skill shortcut)
├─ references/ queries/ src/ scripts/   ← skill implementation
├─ .github/workflows/validate.yml
├─ scripts/validate.sh
├─ package.json  tsconfig.json  bun.lock
├─ LICENSE  README*  PUBLISHING.md
```
`node_modules/` and `dist/` are gitignored; `bun.lock` is committed.

## Validate locally
```bash
bun run typecheck
bun run validate        # JSON parses, SKILL.md frontmatter, manifests
```

## Publish
1. Create the repo `github.com/zeon-kun/ionize`.
2. Push the **contents of this directory** as the repo root (so `.claude-plugin/` and `SKILL.md` sit at the repo root).
   ```bash
   git init && git add -A && git commit -m "ionize plugin"
   git remote add origin git@github.com:zeon-kun/ionize.git
   git push -u origin main
   ```
3. CI (`.github/workflows/validate.yml`) runs typecheck + validate on every push.

## Install / test (consumers)
```text
/plugin marketplace add zeon-kun/ionize     # or a local path for testing
/plugin install ionize@ionize
/reload-plugins
```
Local test without GitHub:
```text
/plugin marketplace add /home/zeonk/codes/vault/.claude/skills/ionize
/plugin install ionize@ionize
```

## Runtime note
The skill shells out to a Bun + tree-sitter pipeline. On first use in a new clone, run `bun install` inside the plugin dir (WASM grammars, no native build). Keep the pinned `web-tree-sitter@0.22` ↔ `tree-sitter-wasms@0.1.13` pairing (ABI compatibility — see `references/pass1-code-graph.md`).

## Versioning
Bump `version` in **both** `.claude-plugin/plugin.json` and the `plugins[0]` entry of `.claude-plugin/marketplace.json` together on each release.
