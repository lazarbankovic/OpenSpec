/**
 * Arch Checkout
 *
 * Copies c4architecture.dsl from the main arch folder into a change folder,
 * along with a .base/ snapshot used for diff-and-patch at archive time.
 */

import { promises as fs } from 'fs';
import path from 'path';

const ARCH_FILENAME = 'c4architecture.dsl';

/**
 * Copy c4architecture.dsl from archDir into the change's arch/ folder.
 * Also writes an identical copy to arch/.base/ for use during archive.
 *
 * @param changeDir  Absolute path to the change folder (e.g. openspec/changes/my-change)
 * @param archDir    Absolute path to openspec/arch/
 */
export async function checkoutArchFile(
  changeDir: string,
  archDir: string
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

  const srcFile = path.join(archDir, ARCH_FILENAME);

  try {
    await fs.access(srcFile);
  } catch {
    throw new Error(
      `Architecture file '${ARCH_FILENAME}' does not exist in openspec/arch/. ` +
        `Run 'openspec arch init' or create the file manually before checking it out.`
    );
  }

  const content = await fs.readFile(srcFile, 'utf-8');

  await fs.writeFile(path.join(archChangeDir, ARCH_FILENAME), content, 'utf-8');
  await fs.writeFile(path.join(baseDir, ARCH_FILENAME), content, 'utf-8');
}
