# Contributing to the Vault

`docs/` is the single source of truth. Obsidian-style vault: one Markdown file per feature/surface, cross-linked with `[[wikilinks]]`, kept authoritative by updating the doc **in the same change** as the code. `docs/index.md` is the Map-of-Content (MOC).

## Naming
- kebab-case, lowercase, `.md`. No spaces, no date/version suffixes — living docs are evergreen, edited in place.
- One doc per feature or API surface. Wikilink by basename: `[[ionize]]`, not a path.

## Living-doc template
Copy `templates/living-doc.md`. Fill the frontmatter, replace the sections. Don't delete sections — write `N/A`.

```markdown
---
title: <Feature>
status: stable          # draft | stable | deprecated
type: feature           # feature | api
source:                 # code paths this doc owns (globs OK) — the doc-sync trigger
  - .claude/skills/<x>/**
---
# <Feature>
<1–3 sentence overview: what it does + the one thing to know first.>

## 1. Model        <data/types, files, contracts>
## 2. Logic        <rules, pipeline, the durable "why">
## 3. Interface    <routes/endpoints/CLI — one bullet each>
## 4. Side-effects <external calls, generated files, integrations>
## 5. Gaps         <explicit non-goals + known limits>
```

## Doc-sync rule
**Any change touching a path in a doc's `source:` updates that doc in the same change.** No "TODO update docs". A behaviour change without a doc update is incomplete; an internal refactor with no observable change leaves prose as-is (just verify nothing went stale).

## Token discipline
Bullets and tables over prose. Frontmatter declares scope so readers skip what they don't need. Wikilinks over URLs. Keep §-headers stable so diffs are clean.
