## ADDED Requirements

### Requirement: Arch Delta Application
The archive command SHALL apply architecture deltas from the change's `arch/` folder after applying spec deltas.

#### Scenario: Change contains arch deltas
- **WHEN** `openspec archive <change>` is run
- **AND** the change folder contains an `arch/` subfolder with `.dsl` files
- **THEN** for each modified `.dsl` file, the command computes the diff between `.base/` and the change version
- **AND** applies that patch to the corresponding file in `openspec/arch/`

#### Scenario: Change contains no arch deltas
- **WHEN** `openspec archive <change>` is run
- **AND** the change folder has no `arch/` subfolder
- **THEN** the archive command proceeds normally without error

#### Scenario: Arch patch conflict
- **WHEN** archiving a change whose arch delta conflicts with changes already applied to the main arch file
- **THEN** the archive command blocks and reports which lines conflict and in which file
- **AND** the AI reads both versions, explains the conflict to the user, and asks whether to merge automatically or manually

### Requirement: ADR Application on Archive
The archive command SHALL copy new ADRs from the change folder to `openspec/arch/decisions/` and handle supersession.

#### Scenario: New ADR archived
- **WHEN** `openspec archive <change>` is run
- **AND** the change folder contains `arch/decisions/*.md` files
- **THEN** each new ADR is copied to `openspec/arch/decisions/` with the next available sequence number

#### Scenario: Superseding ADR archived
- **WHEN** a new ADR contains a `Supersedes: ADR-NNNN` field
- **THEN** the referenced old ADR is moved from `openspec/arch/decisions/` to `openspec/arch/decisions/archive/`
- **AND** the move happens atomically with the rest of the archive operation
