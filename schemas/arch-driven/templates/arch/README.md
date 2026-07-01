# Arch Template

This directory marks the `arch` artifact template for the arch-driven schema.

The agent populates `changes/<name>/arch/` by copying `openspec/arch/c4architecture.dsl`
and its `.base/` snapshot at checkout time — not from this template.

ADR files created during the change are placed in `changes/<name>/arch/decisions/`.
