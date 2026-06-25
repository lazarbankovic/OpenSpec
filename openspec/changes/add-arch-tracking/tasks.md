## 1. Dependencies

- [ ] 1.1 Add `diff` package: `pnpm add diff`
- [ ] 1.2 Add `@types/diff`: `pnpm add -D @types/diff`

## 2. `schemas/arch-driven/schema.yaml`

- [ ] 2.1 Copy `schemas/spec-driven/schema.yaml` to `schemas/arch-driven/schema.yaml`
- [ ] 2.2 Update `name` to `arch-driven`, `description` to reflect arch tracking
- [ ] 2.3 Add `arch` artifact entry with `optional: true`, `generates: "arch/**"`, `requires: [design]`
- [ ] 2.4 Add `instruction` for the `arch` artifact (layer selection, checkout, edit, ADR prompt)

## 3. Schema loader — support `optional` flag

- [ ] 3.1 Locate schema artifact type definition (search for `generates` field in schema loading code)
- [ ] 3.2 Add `optional?: boolean` to the artifact interface
- [ ] 3.3 Update artifact graph / build order to skip optional artifacts when not present in the change

## 4. `openspec/arch/` initialization

- [ ] 4.1 Create `openspec/arch/c1.dsl` with minimal valid System Context stub
- [ ] 4.2 Create `openspec/arch/c2.dsl` with minimal valid Container stub
- [ ] 4.3 Create `openspec/arch/c3.dsl` with minimal valid Component stub
- [ ] 4.4 Create `openspec/arch/c4.dsl` with minimal valid Code stub
- [ ] 4.5 Create `openspec/arch/decisions/.gitkeep`
- [ ] 4.6 Create `openspec/arch/decisions/archive/.gitkeep`

## 5. `src/core/arch-checkout.ts`

- [ ] 5.1 Create file with `checkoutArchLayers(changeDir, archDir, options)` function
- [ ] 5.2 Create `arch/` and `arch/.base/` directories in change folder
- [ ] 5.3 Copy each requested layer from `archDir` to both `arch/` and `arch/.base/`
- [ ] 5.4 Throw descriptive error if `archDir` does not exist (instruct user to run `openspec arch init`)
- [ ] 5.5 Throw descriptive error if a specific layer file does not exist in `archDir`
- [ ] 5.6 Add tests in `test/core/arch-checkout.test.ts`

## 6. `src/core/arch-apply.ts`

- [ ] 6.1 Create file with `findArchUpdates(changeDir, archDir)` function
- [ ] 6.2 Implement `applyArchUpdate(update)`: diff(base → change), apply patch to target via `diff` library
- [ ] 6.3 On patch conflict: throw `ArchConflictError` with details of conflicting hunks and both file paths
- [ ] 6.4 Create `findNewAdrs(changeDir)` — scans `arch/decisions/*.md`, parses `Supersedes:` header field
- [ ] 6.5 Create `applyAdrs(adrs, archDir)`:
  - Determine next sequence number by scanning `archDir/decisions/` for highest `NNNN-` prefix
  - Copy each new ADR to `archDir/decisions/NNNN-<slug>.md`
  - For each ADR with `supersedes`: move old ADR from `archDir/decisions/` to `archDir/decisions/archive/`
- [ ] 6.6 Add tests in `test/core/arch-apply.test.ts` (happy path, conflict detection, ADR supersession)

## 7. Extend `src/core/archive.ts`

- [ ] 7.1 Import `findArchUpdates`, `applyArchUpdate`, `findNewAdrs`, `applyAdrs` from `arch-apply.ts`
- [ ] 7.2 Resolve `mainArchDir = path.join(root.openspecDir, 'arch')` in `ArchiveCommand.run()`
- [ ] 7.3 After spec-apply block: call `findArchUpdates`; if any found, apply each then apply ADRs
- [ ] 7.4 Catch `ArchConflictError`: in human mode print conflict details and resolution instructions; in JSON mode emit structured diagnostic
- [ ] 7.5 Include arch stats in `ArchiveResult` (layers patched, ADRs added, ADRs superseded)
- [ ] 7.6 Add Windows path tests for arch paths

## 8. `src/commands/arch.ts`

- [ ] 8.1 Create file with `createArchCommand()` returning a Commander `Command`
- [ ] 8.2 Add `arch init` subcommand
- [ ] 8.3 Resolve OpenSpec root (reuse `resolveOpenSpecRoot`)
- [ ] 8.4 Check if `openspec/arch/` already exists — print message and exit without overwriting
- [ ] 8.5 Write the four `.dsl` stub files (content defined in task 4.1–4.4)
- [ ] 8.6 Create `decisions/` and `decisions/archive/` directories with `.gitkeep` files
- [ ] 8.7 Print success message: `✓ Created openspec/arch/ — set schema: arch-driven in openspec/config.yaml to enable arch tracking`

## 9. Register `arch` command in `src/cli/index.ts`

- [ ] 9.1 Import `createArchCommand` from `../commands/arch.js`
- [ ] 9.2 Register: `program.addCommand(createArchCommand())`

## 10. AI Workflow Templates

- [ ] 10.1 In `src/core/templates/workflows/propose.ts`: add arch section
  - Read all ADRs from `openspec/arch/decisions/` before generating artifacts
  - Stop at first ADR conflict, report to user, require explicit approval to supersede
  - Determine which C4 layers are affected (C2+C3 default heuristic)
  - Check out layers via `openspec` file operations
  - Edit the copied `.dsl` files to reflect the proposed change
  - Ask user about ADR if meaningful architectural decision detected
- [ ] 10.2 In `src/core/templates/workflows/apply-change.ts`: add user-initiated ADR instruction
  - If user says "add an ADR for X": create ADR in `changes/<name>/arch/decisions/` with all four sections
- [ ] 10.3 Export updated templates from `src/core/templates/skill-templates.ts` (if needed)

## 11. Tests

- [ ] 11.1 `test/core/arch-checkout.test.ts` — checkout copies files, creates .base/, throws on missing archDir
- [ ] 11.2 `test/core/arch-apply.test.ts` — patch applies, conflict detection, ADR sequence numbering, supersession move
- [ ] 11.3 `test/commands/arch.test.ts` — arch init creates correct files, idempotent on re-run
- [ ] 11.4 Extend `test/core/archive.test.ts` — archive with arch/ in change applies patches and ADRs
