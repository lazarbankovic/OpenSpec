import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import {
  findArchUpdates,
  applyArchUpdate,
  findNewAdrs,
  applyAdrs,
  ArchConflictError,
} from '../../src/core/arch-apply.js';

describe('findArchUpdates', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `openspec-arch-apply-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('returns empty array when no arch/ folder exists', async () => {
    const changeDir = path.join(tempDir, 'change');
    await fs.mkdir(changeDir, { recursive: true });

    const updates = await findArchUpdates(changeDir, path.join(tempDir, 'arch'));
    expect(updates).toHaveLength(0);
  });

  it('finds structurizr files in arch/ excluding .base/', async () => {
    const changeDir = path.join(tempDir, 'change');
    const archDir = path.join(tempDir, 'arch');
    const archChangeDir = path.join(changeDir, 'arch');
    const baseDir = path.join(archChangeDir, '.base');

    await fs.mkdir(archChangeDir, { recursive: true });
    await fs.mkdir(baseDir, { recursive: true });

    await fs.writeFile(path.join(archChangeDir, 'c2.dsl'), 'c2 content', 'utf-8');
    await fs.writeFile(path.join(archChangeDir, 'c3.dsl'), 'c3 content', 'utf-8');
    await fs.writeFile(path.join(baseDir, 'c2.dsl'), 'c2 base', 'utf-8');
    await fs.writeFile(path.join(baseDir, 'c3.dsl'), 'c3 base', 'utf-8');

    const updates = await findArchUpdates(changeDir, archDir);
    expect(updates).toHaveLength(2);
    expect(updates.map((u) => u.layer).sort()).toEqual(['c2', 'c3']);
  });
});

describe('applyArchUpdate', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `openspec-arch-apply-patch-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('applies changes from source on top of an updated target', async () => {
    // Base: just A
    const base = `workspace {\n    model {\n        a = softwareSystem "A"\n    }\n}\n`;
    // Source: added B after A (the change this PR made)
    const source = `workspace {\n    model {\n        a = softwareSystem "A"\n        b = softwareSystem "B"\n    }\n}\n`;
    // Target: concurrently added C in the views block (completely different location)
    const target = `workspace {\n    model {\n        a = softwareSystem "A"\n    }\n    views {\n        c = systemContext a "C"\n    }\n}\n`;

    const baseFile = path.join(tempDir, 'base.dsl');
    const sourceFile = path.join(tempDir, 'source.dsl');
    const targetFile = path.join(tempDir, 'target.dsl');

    await fs.writeFile(baseFile, base, 'utf-8');
    await fs.writeFile(sourceFile, source, 'utf-8');
    await fs.writeFile(targetFile, target, 'utf-8');

    await applyArchUpdate({
      layer: 'c2',
      source: sourceFile,
      base: baseFile,
      target: targetFile,
    });

    const result = await fs.readFile(targetFile, 'utf-8');
    // B (from source patch) and the views block (from concurrent target change) should both be present
    expect(result).toContain('"B"');
    expect(result).toContain('"C"');
  });

  it('skips write when source equals base (no changes)', async () => {
    const content = `workspace { model {} }\n`;
    const baseFile = path.join(tempDir, 'base.dsl');
    const sourceFile = path.join(tempDir, 'source.dsl');
    const targetFile = path.join(tempDir, 'target.dsl');

    await fs.writeFile(baseFile, content, 'utf-8');
    await fs.writeFile(sourceFile, content, 'utf-8');
    await fs.writeFile(targetFile, 'different target content\n', 'utf-8');

    await applyArchUpdate({
      layer: 'c2',
      source: sourceFile,
      base: baseFile,
      target: targetFile,
    });

    // Target should be untouched since there were no changes
    const result = await fs.readFile(targetFile, 'utf-8');
    expect(result).toBe('different target content\n');
  });

  it('creates target file when it does not exist yet', async () => {
    const base = `workspace { model {} }\n`;
    const source = `workspace { model { a = softwareSystem "A" } }\n`;
    const baseFile = path.join(tempDir, 'base.dsl');
    const sourceFile = path.join(tempDir, 'source.dsl');
    const targetFile = path.join(tempDir, 'new-target.dsl');

    await fs.writeFile(baseFile, base, 'utf-8');
    await fs.writeFile(sourceFile, source, 'utf-8');

    await applyArchUpdate({
      layer: 'c2',
      source: sourceFile,
      base: baseFile,
      target: targetFile,
    });

    const result = await fs.readFile(targetFile, 'utf-8');
    expect(result).toBe(source);
  });

  it('throws ArchConflictError when patch cannot apply', async () => {
    // Both source and target changed the exact same line differently
    const base = `workspace {\n  model {\n    a = softwareSystem "Original"\n  }\n}\n`;
    const source = `workspace {\n  model {\n    a = softwareSystem "From Source"\n  }\n}\n`;
    const target = `workspace {\n  model {\n    a = softwareSystem "From Target"\n  }\n}\n`;

    const baseFile = path.join(tempDir, 'base.dsl');
    const sourceFile = path.join(tempDir, 'source.dsl');
    const targetFile = path.join(tempDir, 'target.dsl');

    await fs.writeFile(baseFile, base, 'utf-8');
    await fs.writeFile(sourceFile, source, 'utf-8');
    await fs.writeFile(targetFile, target, 'utf-8');

    await expect(
      applyArchUpdate({
        layer: 'c2',
        source: sourceFile,
        base: baseFile,
        target: targetFile,
      })
    ).rejects.toBeInstanceOf(ArchConflictError);
  });
});

describe('findNewAdrs + applyAdrs', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `openspec-adrs-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('finds ADR files and parses Supersedes field', async () => {
    const changeDir = path.join(tempDir, 'change');
    const decisionsDir = path.join(changeDir, 'arch', 'decisions');
    await fs.mkdir(decisionsDir, { recursive: true });

    await fs.writeFile(
      path.join(decisionsDir, 'adopt-event-sourcing.md'),
      `# ADR: Adopt Event Sourcing\n\n**Status**: Accepted\n**Supersedes**: ADR-0001\n\n## Decision\nUse event sourcing.\n`,
      'utf-8'
    );

    const adrs = await findNewAdrs(changeDir);
    expect(adrs).toHaveLength(1);
    expect(adrs[0].slug).toBe('adopt-event-sourcing');
    expect(adrs[0].supersedes).toBe('ADR-0001');
  });

  it('copies ADR to decisions/ with next sequence number', async () => {
    const changeDir = path.join(tempDir, 'change');
    const archDir = path.join(tempDir, 'arch');
    const decisionsDir = path.join(changeDir, 'arch', 'decisions');
    const mainDecisionsDir = path.join(archDir, 'decisions');

    await fs.mkdir(decisionsDir, { recursive: true });
    await fs.mkdir(mainDecisionsDir, { recursive: true });
    await fs.mkdir(path.join(mainDecisionsDir, 'archive'), { recursive: true });

    // Existing ADR in main
    await fs.writeFile(
      path.join(mainDecisionsDir, '0001-initial.md'),
      '# ADR-0001',
      'utf-8'
    );

    // New ADR in change
    await fs.writeFile(
      path.join(decisionsDir, 'new-decision.md'),
      '# New Decision\n\n## Decision\nDo the thing.\n',
      'utf-8'
    );

    const adrs = await findNewAdrs(changeDir);
    await applyAdrs(adrs, archDir);

    // Should be numbered 0002
    const files = await fs.readdir(mainDecisionsDir);
    expect(files).toContain('0002-new-decision.md');
  });

  it('moves superseded ADR to decisions/archive/', async () => {
    const changeDir = path.join(tempDir, 'change');
    const archDir = path.join(tempDir, 'arch');
    const decisionsDir = path.join(changeDir, 'arch', 'decisions');
    const mainDecisionsDir = path.join(archDir, 'decisions');
    const archiveDir = path.join(mainDecisionsDir, 'archive');

    await fs.mkdir(decisionsDir, { recursive: true });
    await fs.mkdir(mainDecisionsDir, { recursive: true });
    await fs.mkdir(archiveDir, { recursive: true });

    // Existing ADR to be superseded
    await fs.writeFile(
      path.join(mainDecisionsDir, '0001-old-decision.md'),
      '# ADR-0001: Old Decision',
      'utf-8'
    );

    // New ADR that supersedes 0001
    await fs.writeFile(
      path.join(decisionsDir, 'new-decision.md'),
      `# New Decision\n\n**Status**: Accepted\n**Supersedes**: ADR-0001\n\n## Decision\nNew thing.\n`,
      'utf-8'
    );

    const adrs = await findNewAdrs(changeDir);
    await applyAdrs(adrs, archDir);

    // Old ADR should be in archive
    const archiveFiles = await fs.readdir(archiveDir);
    expect(archiveFiles).toContain('0001-old-decision.md');

    // Old ADR should no longer be in decisions/
    const mainFiles = await fs.readdir(mainDecisionsDir);
    expect(mainFiles).not.toContain('0001-old-decision.md');
  });
});
