# Publishing ionize as a marketplace plugin

The vault repo (`github.com/zeon-kun/ionize`) doubles as the **marketplace** that
hosts this plugin. The marketplace manifest lives at the **vault root**, not here:

```
<vault root>/
├─ .claude-plugin/marketplace.json     ← marketplace, source: ./.claude/skills/ionize
├─ .github/workflows/validate.yml      ← CI (runs from repo root, cds into this dir)
└─ .claude/skills/ionize/              ← this directory = the plugin
   ├─ .claude-plugin/plugin.json       ← plugin manifest (what install reads)
   ├─ SKILL.md                         ← the skill
   ├─ references/ queries/ src/ scripts/
   ├─ package.json  tsconfig.json  bun.lock
   └─ LICENSE  PUBLISHING.md
```

`node_modules/` and `dist/` are gitignored; `bun.lock` is committed.

## Validate locally
```bash
bun run typecheck
bun run validate        # JSON parses, SKILL.md frontmatter, plugin.json fields
```

## Publish
The root marketplace manifest is already in place — publishing is just pushing the vault.
```bash
git add -A && git commit -m "release ionize <version>"
git push
```

## Install / test (consumers)
```text
/plugin marketplace add zeon-kun/ionize
/plugin install ionize@ionize
/reload-plugins
```
Local test without pushing (point at the vault root, not this dir):
```text
/plugin marketplace add /home/zeonk/codes/vault
/plugin install ionize@ionize
```

## Runtime note
The skill shells out to a Bun + tree-sitter pipeline. On first use in a new clone,
run `bun install` inside this dir (WASM grammars, no native build). Keep the pinned
`web-tree-sitter@0.22` ↔ `tree-sitter-wasms@0.1.13` pairing (ABI compatibility —
see `references/pass1-code-graph.md`).

## Versioning
Bump `version` in **both** `.claude/skills/ionize/.claude-plugin/plugin.json` and the
`plugins[0]` entry of the vault-root `.claude-plugin/marketplace.json` together on each release.
