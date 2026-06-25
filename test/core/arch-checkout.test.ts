import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { checkoutArchLayers } from '../../src/core/arch-checkout.js';

describe('checkoutArchLayers', () => {
  let tempDir: string;
  let archDir: string;
  let changeDir: string;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `openspec-arch-checkout-test-${Date.now()}`);
    archDir = path.join(tempDir, 'openspec', 'arch');
    changeDir = path.join(tempDir, 'openspec', 'changes', 'my-change');

    await fs.mkdir(archDir, { recursive: true });
    await fs.mkdir(changeDir, { recursive: true });

    // Write stub structurizr files
    for (const layer of ['c1', 'c2', 'c3', 'c4']) {
      await fs.writeFile(
        path.join(archDir, `${layer}.dsl`),
        `workspace "${layer.toUpperCase()}" {}`,
        'utf-8'
      );
    }
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('copies specified layers to arch/ and arch/.base/', async () => {
    await checkoutArchLayers(changeDir, archDir, { layers: ['c2', 'c3'] });

    const archChangeDir = path.join(changeDir, 'arch');
    const baseDir = path.join(archChangeDir, '.base');

    // Both c2 and c3 should exist in arch/ and .base/
    for (const layer of ['c2', 'c3']) {
      const archFile = path.join(archChangeDir, `${layer}.dsl`);
      const baseFile = path.join(baseDir, `${layer}.dsl`);

      const archContent = await fs.readFile(archFile, 'utf-8');
      const baseContent = await fs.readFile(baseFile, 'utf-8');
      const srcContent = `workspace "${layer.toUpperCase()}" {}`;

      expect(archContent).toBe(srcContent);
      expect(baseContent).toBe(srcContent);
    }
  });

  it('does not copy layers that were not requested', async () => {
    await checkoutArchLayers(changeDir, archDir, { layers: ['c2'] });

    const archChangeDir = path.join(changeDir, 'arch');

    // c1 should NOT be present
    await expect(
      fs.access(path.join(archChangeDir, 'c1.dsl'))
    ).rejects.toThrow();
  });

  it('arch/ and .base/ files have identical content', async () => {
    await checkoutArchLayers(changeDir, archDir, { layers: ['c3'] });

    const archChangeDir = path.join(changeDir, 'arch');
    const archContent = await fs.readFile(
      path.join(archChangeDir, 'c3.dsl'),
      'utf-8'
    );
    const baseContent = await fs.readFile(
      path.join(archChangeDir, '.base', 'c3.dsl'),
      'utf-8'
    );

    expect(archContent).toBe(baseContent);
  });

  it('throws when openspec/arch/ does not exist', async () => {
    const missingArchDir = path.join(tempDir, 'no-arch');

    await expect(
      checkoutArchLayers(changeDir, missingArchDir, { layers: ['c2'] })
    ).rejects.toThrow(/openspec\/arch\/ does not exist/);
  });

  it('throws when a requested layer file is missing', async () => {
    // Remove c2 from the arch dir
    await fs.rm(path.join(archDir, 'c2.dsl'));

    await expect(
      checkoutArchLayers(changeDir, archDir, { layers: ['c2'] })
    ).rejects.toThrow(/c2\.dsl.*does not exist/);
  });
});
