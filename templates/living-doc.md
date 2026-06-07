---
title: <Feature>
status: draft           # draft | stable | deprecated
type: feature           # feature | api
related: []
source:                 # code paths this doc owns (globs OK) — the doc-sync trigger
  - <path/**>
last-reviewed: <YYYY-MM-DD>
---

# <Feature>

<1–3 sentence overview: what it does + the one thing to know first.>

## 1. Model
<Data/types, key files, contracts. For surfaces with no storage of their own: "consumes [[other-doc]]".>

## 2. Logic
<Rules, pipeline, the durable "why". Sub-sections (### 2.1) + tables for numbers.>

## 3. Interface
<Routes / endpoints / CLI commands — one bullet each, with args + output.>

## 4. Side-effects
<External calls, generated files, integrations.>

## 5. Gaps
<Explicit non-goals + known limitations.>
