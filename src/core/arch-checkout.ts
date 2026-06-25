/**
 * Arch Checkout
 *
 * Copies C4 Structurizr layers from the main arch folder into a change folder,
 * along with a .base/ snapshot used for diff-and-patch at archive time.
 */

import { promises as fs } from 'fs';
import path from 'path';

export type C4Layer = 'c1' | 'c2' | 'c3' | 'c4';

export interface ArchCheckoutOptions {
  layers: C4Layer[];
}

/**
 * Copy the specified C4 layers from archDir into the change's arch/ folder.
 * Also writes an identical copy to arch/.base/ for use during archive.
 *
 * @param changeDir  Absolute path to the change folder (e.g. openspec/changes/my-change)
 * @param archDir    Absolute path to openspec/arch/
 * @param options    Which layers to check out
 */
export async function checkoutArchLayers(
  changeDir: string,
  archDir: string,
  options: ArchCheckoutOptions
): Promise<void> {
  // Verify arch folder exists
  try {
    const stat = await fs.stat(archDir);
    if (!stat.isDirectory()) {
      throw new Error(`${archDir} is not a directory`);
    }
  } catch {
    throw new Error(
      `openspec/arch/ does not exist. Run 'openspec arch init' to initialize architecture tracking.`
    );
  }

  const archChangeDir = path.join(changeDir, 'arch');
  const baseDir = path.join(archChangeDir, '.base');

  await fs.mkdir(archChangeDir, { recursive: true });
  await fs.mkdir(baseDir, { recursive: true });

  for (const layer of options.layers) {
    const srcFile = path.join(archDir, `${layer}.dsl`);

    // Verify the layer file exists in the arch folder
    try {
      await fs.access(srcFile);
    } catch {
      throw new Error(
        `Layer file '${layer}.dsl' does not exist in openspec/arch/. ` +
          `Run 'openspec arch init' or create the file manually before checking it out.`
      );
    }

    const content = await fs.readFile(srcFile, 'utf-8');
    const destFile = path.join(archChangeDir, `${layer}.dsl`);
    const baseFile = path.join(baseDir, `${layer}.dsl`);

    await fs.writeFile(destFile, content, 'utf-8');
    await fs.writeFile(baseFile, content, 'utf-8');
  }
}
