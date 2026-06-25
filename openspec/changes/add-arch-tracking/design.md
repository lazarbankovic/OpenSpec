## Context

OpenSpec manages behavioral specs and changes but has no architecture layer. This change adds C4 diagram tracking (via Structurizr DSL) and Architecture Decision Records alongside the existing spec workflow.

Relevant existing files:
- `src/core/archive.ts` — `ArchiveCommand.run()` applies spec deltas then moves the change folder; arch apply hooks in after spec apply
- `src/core/specs-apply.ts` — pattern for `arch-apply.ts` to follow (find files → compute changes → write)
- `schemas/spec-driven/schema.yaml` — base schema; `arch-driven` is a standalone copy plus arch artifact
- `src/cli/index.ts` — registers command groups; `arch` group registers here
- `src/core/templates/workflows/` — AI workflow instructions; propose and apply-change get arch sections

## Goals / Non-Goals

**Goals:**
- `openspec/arch/` as permanent store for C4 diagrams and ADRs
- AI copies only affected C4 layers (C2+C3 by default) into the change folder and edits valid DSL
- `.base/` snapshot at checkout enables diff-and-patch at archive time
- ADRs are active guardrails: AI checks for conflicts before proceeding, stops at first conflict, requires explicit user approval to supersede
- ADR creation: AI-initiated (with user confirmation) or user-initiated on demand
- `openspec arch init` scaffolds `openspec/arch/` with minimal valid Structurizr DSL stubs
- `arch-driven` schema ships inside OpenSpec; users opt in via `schema: arch-driven` in `openspec/config.yaml`
- Archive applies arch deltas atomically with spec deltas

**Non-Goals:**
- Modifying `spec-driven` schema
- Parsing or validating Structurizr DSL syntax beyond file presence
- Real-time diagram rendering in the CLI
- Automatic architecture inference without a proposal

## Decisions

### 1. `arch-driven` schema is a standalone copy of `spec-driven`

`schemas/arch-driven/schema.yaml` duplicates all `spec-driven` artifact definitions and adds the `arch` artifact. No `extends` mechanism. Both schemas ship inside OpenSpec and are maintained together. Standalone avoids runtime inheritance complexity and schema loader changes.

### 2. `arch` artifact is conditional — AI decides at propose time

The `arch` artifact has `optional: true` in the schema. During `/opsx:propose`, if the AI determines the change touches architecture (new service, new pattern, boundary change, etc.), it includes `arch` in the build order for that change. If not, `arch` is absent. This prevents every trivial change from needing an explicit "no architecture changes" acknowledgement.

### 3. C4 layer selection defaults: C2 + C3

AI copies Container (C2) and Component (C3) by default. System Context (C1) is added only when external system boundaries change. Code (C4) is added only when class/function-level design is explicitly part of the change.

### 4. `.base/` snapshot committed to git

The `.base/` subdirectory inside `changes/<name>/arch/` is committed. It holds the baseline state of each copied layer at checkout time — required for diff-and-patch at archive time. Files are small, stable (never edited), and losing them breaks the workflow.

### 5. Diff-and-patch merge strategy

`arch-apply.ts` uses the `diff` npm package to compute a line-level patch from `.base/` → change version, then applies it to the current main arch file. This preserves concurrent changes from other changes that archived in the interim. On conflict: archive blocks, AI reads both versions, explains the conflict, and asks the user: "Should I merge this, or do you want to resolve it manually?"

### 6. ADR format — four required sections

Every ADR requires: Decision, Reasoning, Trade-offs, Rejected Alternatives. The `Supersedes: ADR-NNNN` field is optional (only when replacing an existing ADR). The archive command reads this field to move the old ADR to `decisions/archive/`.

### 7. ADR supersession at archive time only

Old ADRs stay active in `openspec/arch/decisions/` until the change archives. This ensures an abandoned change never invalidates a guardrail. On archive, the superseded ADR moves to `decisions/archive/`.

### 8. `openspec arch init` on demand

Not part of `openspec init`. An explicit `openspec arch init` command scaffolds the folder. Projects that don't want C4 tracking never see the folder.

## File-Level Design

### `src/core/arch-checkout.ts`

```typescript
export interface ArchCheckoutOptions {
  layers: ('c1' | 'c2' | 'c3' | 'c4')[];
}

export async function checkoutArchLayers(
  changeDir: string,
  archDir: string,
  options: ArchCheckoutOptions
): Promise<void>
```

- Creates `changes/<name>/arch/` and `changes/<name>/arch/.base/`
- For each layer in `options.layers`: copies `archDir/<layer>.dsl` to both locations
- If `archDir` does not exist: throws a descriptive error (user should run `openspec arch init` first)
- If a specific layer file does not exist in `archDir`: throws — cannot checkout a layer that hasn't been initialized

### `src/core/arch-apply.ts`

```typescript
export interface ArchUpdate {
  layer: string;       // e.g. 'c3'
  source: string;      // changes/<name>/arch/c3.dsl
  base: string;        // changes/<name>/arch/.base/c3.dsl
  target: string;      // openspec/arch/c3.dsl
}

export interface AdrFile {
  source: string;      // changes/<name>/arch/decisions/0003-slug.md
  supersedes?: string; // 'ADR-0001' parsed from Supersedes: field
}

export async function findArchUpdates(changeDir: string, archDir: string): Promise<ArchUpdate[]>
export async function applyArchUpdate(update: ArchUpdate): Promise<void>
export async function findNewAdrs(changeDir: string): Promise<AdrFile[]>
export async function applyAdrs(adrs: AdrFile[], archDir: string): Promise<void>
```

- `findArchUpdates`: scans `changes/<name>/arch/*.dsl` (excluding `.base/`)
- `applyArchUpdate`: reads base + change versions, computes patch via `diff` library, applies to target
- `findNewAdrs`: scans `changes/<name>/arch/decisions/*.md`, parses `Supersedes:` field
- `applyAdrs`: copies new ADR to `archDir/decisions/` with next sequence number; moves superseded ADR to `archDir/decisions/archive/`

### `src/core/archive.ts` extension

After the existing spec-apply block in `ArchiveCommand.run()`, add:

```typescript
// Apply arch deltas if arch/ folder exists in the change
const archUpdates = await findArchUpdates(changeDir, mainArchDir);
if (archUpdates.length > 0) {
  for (const update of archUpdates) {
    await applyArchUpdate(update);
  }
  const newAdrs = await findNewAdrs(changeDir);
  await applyAdrs(newAdrs, mainArchDir);
}
```

The `mainArchDir` resolves to `path.join(root.openspecDir, 'arch')`. No error if `arch/` is absent from the change — arch is optional.

### `src/commands/arch.ts`

Commander subcommand group:

```typescript
export function createArchCommand(): Command {
  const arch = new Command('arch').description('Architecture tracking commands');

  arch
    .command('init')
    .description('Initialize the openspec/arch/ folder with C4 Structurizr stubs')
    .action(async () => { /* scaffold */ });

  return arch;
}
```

`arch init` creates:
- `openspec/arch/c1.dsl` (System Context stub)
- `openspec/arch/c2.dsl` (Container stub)
- `openspec/arch/c3.dsl` (Component stub)
- `openspec/arch/c4.dsl` (Code stub)
- `openspec/arch/decisions/` (empty directory, `.gitkeep`)
- `openspec/arch/decisions/archive/` (empty directory, `.gitkeep`)

Each stub is a minimal valid Structurizr DSL `workspace {}` block with comments indicating the C4 level.

If `openspec/arch/` already exists: print a message and exit without overwriting.

### AI Workflow Templates

Add an `arch` section to `propose.ts` and `apply-change.ts`:

1. **Read existing ADRs** from `openspec/arch/decisions/` — check for conflicts before generating proposal artifacts. Stop at first conflict. If conflict found, halt and report to user.
2. **Determine arch scope** — based on proposal content, decide which C4 layers are affected (C2+C3 default).
3. **Checkout layers** — call `openspec status` to get the change's artifact paths, then copy layers.
4. **Edit layers** — update the `.dsl` files in the change folder to reflect the proposed changes.
5. **ADR prompt** — if a meaningful architectural decision is detected, ask: "This introduces [X]. Should I record this as an ADR?" Create if confirmed.
6. **User-initiated ADR** — if user says "add an ADR for X" at any point, create it immediately in `changes/<name>/arch/decisions/`.
