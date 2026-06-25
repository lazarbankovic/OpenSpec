## Why

OpenSpec tracks behavioral specs but has no first-class support for architecture. Teams using OpenSpec today have no structured place to record C4 diagrams or the reasoning behind architectural decisions. Architecture drifts silently — a new engineer joins, proposes something that was already rejected two years ago, and nobody notices until it's too late.

The goal: make architecture a first-class citizen in OpenSpec, tightly coupled to the change workflow so diagrams and decisions stay in sync with the work.

## What Changes

- **New `openspec/arch/` folder** — permanent store for C4 Structurizr diagrams (`c1`–`c4`) and Architecture Decision Records
- **New `openspec arch init` command** — opt-in scaffolding for the arch folder with valid Structurizr DSL stubs
- **New `arch-driven` schema** — extends `spec-driven` with an optional `arch` artifact; changes opt in via `schema: arch-driven`
- **Arch artifact in changes** — AI copies relevant C4 layers into the change folder, edits them as valid DSL, stores a `.base/` snapshot for diff-and-patch
- **ADRs as guardrails** — AI checks existing ADRs before proceeding with any proposal; conflicts require explicit user approval; ADR creation is AI-initiated (with confirmation) or user-initiated on demand
- **Archive extended** — `openspec archive` now also applies arch deltas and handles ADR supersession

## Capabilities

### New Capabilities

- `arch-tracking` — The `openspec/arch/` folder structure: C4 diagram files, ADR store, supersession model
- `cli-arch` — The `openspec arch` command group (`arch init`)

### Modified Capabilities

- `cli-archive` — Archive now applies arch deltas (C4 patch, ADR copy, ADR supersession move) after spec deltas

## Impact

- New files: `src/core/arch-checkout.ts`, `src/core/arch-apply.ts`, `src/commands/arch.ts`, `schemas/arch-driven/schema.yaml`
- Modified files: `src/core/archive.ts`, `src/cli/index.ts`, `src/core/templates/workflows/propose.ts`, `src/core/templates/workflows/apply-change.ts`
- New npm dependency: `diff` (line-level diffing for arch-apply)
- No breaking changes to `spec-driven` schema or existing commands
