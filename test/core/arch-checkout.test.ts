import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { checkoutArchFile } from '../../src/core/arch-checkout.js';

const ARCH_FILENAME = 'c4architecture.dsl';

describe('checkoutArchFile', () => {
  let tempDir: string;
  let archDir: string;
  let changeDir: string;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `openspec-arch-checkout-test-${Date.now()}`);
    archDir = path.join(tempDir, 'openspec', 'arch');
    changeDir = path.join(tempDir, 'openspec', 'changes', 'my-change');

    await fs.mkdir(archDir, { recursive: true });
    await fs.mkdir(changeDir, { recursive: true });

    await fs.writeFile(
      path.join(archDir, ARCH_FILENAME),
      `workspace "C4 Architecture" {}`,
      'utf-8'
    );
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('copies c4architecture.dsl to arch/ and arch/.base/', async () => {
    await checkoutArchFile(changeDir, archDir);

    const archChangeDir = path.join(changeDir, 'arch');
    const baseDir = path.join(archChangeDir, '.base');

    const archContent = await fs.readFile(path.join(archChangeDir, ARCH_FILENAME), 'utf-8');
    const baseContent = await fs.readFile(path.join(baseDir, ARCH_FILENAME), 'utf-8');
    const srcContent = `workspace "C4 Architecture" {}`;

    expect(archContent).toBe(srcContent);
    expect(baseContent).toBe(srcContent);
  });

  it('arch/ and .base/ files have identical content', async () => {
    await checkoutArchFile(changeDir, archDir);

    const archChangeDir = path.join(changeDir, 'arch');
    const archContent = await fs.readFile(
      path.join(archChangeDir, ARCH_FILENAME),
      'utf-8'
    );
    const baseContent = await fs.readFile(
      path.join(archChangeDir, '.base', ARCH_FILENAME),
      'utf-8'
    );

    expect(archContent).toBe(baseContent);
  });

  it('throws when openspec/arch/ does not exist', async () => {
    const missingArchDir = path.join(tempDir, 'no-arch');

    await expect(
      checkoutArchFile(changeDir, missingArchDir)
    ).rejects.toThrow(/openspec\/arch\/ does not exist/);
  });

  it('throws when c4architecture.dsl is missing', async () => {
    await fs.rm(path.join(archDir, ARCH_FILENAME));

    await expect(
      checkoutArchFile(changeDir, archDir)
    ).rejects.toThrow(/c4architecture\.dsl.*does not exist/);
  });
});
