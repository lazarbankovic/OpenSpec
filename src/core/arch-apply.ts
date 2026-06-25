/**
 * Arch Apply
 *
 * Applies architecture deltas from a change folder to the main openspec/arch/ folder.
 * Uses line-level diff-and-patch so concurrent changes to the same layer compose cleanly.
 * Also handles ADR sequencing and ADR supersession.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { applyPatch, createPatch } from 'diff';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface ArchUpdate {
  /** e.g. 'c3' */
  layer: string;
  /** Absolute path: changes/<name>/arch/c3.dsl */
  source: string;
  /** Absolute path: changes/<name>/arch/.base/c3.dsl */
  base: string;
  /** Absolute path: openspec/arch/c3.dsl */
  target: string;
}

export interface AdrFile {
  /** Absolute path to the new ADR in the change folder */
  source: string;
  /** Parsed slug from the filename (without sequence prefix) */
  slug: string;
  /** Value of 'Supersedes: ADR-NNNN' header field, if present */
  supersedes?: string;
}

export class ArchConflictError extends Error {
  readonly layer: string;
  readonly sourcePath: string;
  readonly targetPath: string;

  constructor(layer: string, sourcePath: string, targetPath: string, detail: string) {
    super(
      `Arch conflict in ${layer}.dsl: ${detail}\n` +
        `  Change version: ${sourcePath}\n` +
        `  Main version:   ${targetPath}\n` +
        `Resolve the conflict in the change file, then re-run archive.`
    );
    this.name = 'ArchConflictError';
    this.layer = layer;
    this.sourcePath = sourcePath;
    this.targetPath = targetPath;
  }
}

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

/**
 * Find all Structurizr layer files in the change's arch/ folder (excluding .base/).
 */
export async function findArchUpdates(changeDir: string, archDir: string): Promise<ArchUpdate[]> {
  const updates: ArchUpdate[] = [];
  const archChangeDir = path.join(changeDir, 'arch');

  try {
    await fs.access(archChangeDir);
  } catch {
    // No arch/ folder in this change — nothing to do
    return updates;
  }

  const entries = await fs.readdir(archChangeDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!entry.name.endsWith('.dsl')) continue;

    const layer = entry.name.replace('.dsl', '');
    const source = path.join(archChangeDir, entry.name);
    const base = path.join(archChangeDir, '.base', entry.name);
    const target = path.join(archDir, entry.name);

    updates.push({ layer, source, base, target });
  }

  return updates;
}

/**
 * Apply a single arch update: diff(base → source) then patch into target.
 * Throws ArchConflictError if the patch cannot apply cleanly.
 */
export async function applyArchUpdate(update: ArchUpdate): Promise<void> {
  const [baseContent, sourceContent] = await Promise.all([
    fs.readFile(update.base, 'utf-8'),
    fs.readFile(update.source, 'utf-8'),
  ]);

  // Read current main — may have advanced since the base was snapshotted
  let targetContent: string;
  try {
    targetContent = await fs.readFile(update.target, 'utf-8');
  } catch {
    // Target doesn't exist yet — use the source directly
    await fs.writeFile(update.target, sourceContent, 'utf-8');
    return;
  }

  // If source matches base exactly, nothing changed — skip
  if (sourceContent === baseContent) {
    return;
  }

  // Compute patch from base → source (what this change did)
  const patch = createPatch(
    update.layer + '.dsl',
    baseContent,
    sourceContent,
    '',
    ''
  );

  // Apply that patch to the current main
  const patched = applyPatch(targetContent, patch, { fuzzFactor: 2 });

  if (patched === false) {
    throw new ArchConflictError(
      update.layer,
      update.source,
      update.target,
      'patch could not be applied cleanly — the same lines may have been modified by another change that archived first'
    );
  }

  await fs.writeFile(update.target, patched, 'utf-8');
}

/**
 * Find new ADR files in the change's arch/decisions/ folder.
 */
export async function findNewAdrs(changeDir: string): Promise<AdrFile[]> {
  const adrs: AdrFile[] = [];
  const decisionsDir = path.join(changeDir, 'arch', 'decisions');

  try {
    await fs.access(decisionsDir);
  } catch {
    return adrs;
  }

  const entries = await fs.readdir(decisionsDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!entry.name.endsWith('.md')) continue;

    const source = path.join(decisionsDir, entry.name);
    const content = await fs.readFile(source, 'utf-8');

    // Parse optional 'Supersedes: ADR-NNNN' field from the header block
    const supersedes = parseSupersedes(content);

    // Strip any leading NNNN- prefix from the filename to get the slug
    const slug = entry.name.replace(/^\d+-/, '').replace(/\.md$/, '');

    adrs.push({ source, slug, ...(supersedes ? { supersedes } : {}) });
  }

  return adrs;
}

/**
 * Copy new ADRs into archDir/decisions/ with the next sequence number.
 * Move any superseded ADRs to archDir/decisions/archive/.
 */
export async function applyAdrs(adrs: AdrFile[], archDir: string): Promise<void> {
  if (adrs.length === 0) return;

  const decisionsDir = path.join(archDir, 'decisions');
  const archiveDir = path.join(decisionsDir, 'archive');

  await fs.mkdir(decisionsDir, { recursive: true });
  await fs.mkdir(archiveDir, { recursive: true });

  for (const adr of adrs) {
    // Determine the next sequence number
    const nextNum = await nextAdrSequenceNumber(decisionsDir);
    const paddedNum = String(nextNum).padStart(4, '0');
    const destName = `${paddedNum}-${adr.slug}.md`;
    const destPath = path.join(decisionsDir, destName);

    await fs.copyFile(adr.source, destPath);

    // Handle supersession: move old ADR to decisions/archive/
    if (adr.supersedes) {
      await moveSupersededAdr(adr.supersedes, decisionsDir, archiveDir);
    }
  }
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

/**
 * Parse the 'Supersedes: ADR-NNNN' field from ADR content.
 * Returns e.g. 'ADR-0001' or undefined if not present.
 */
function parseSupersedes(content: string): string | undefined {
  const match = content.match(/^\*\*Supersedes\*\*:\s*(ADR-\d+)/m)
    ?? content.match(/^Supersedes:\s*(ADR-\d+)/m);
  return match?.[1];
}

/**
 * Scan decisionsDir for the highest NNNN- prefix and return the next number.
 */
async function nextAdrSequenceNumber(decisionsDir: string): Promise<number> {
  let entries: string[] = [];
  try {
    entries = await fs.readdir(decisionsDir);
  } catch {
    return 1;
  }

  let max = 0;
  for (const name of entries) {
    const match = name.match(/^(\d+)-/);
    if (match) {
      const n = parseInt(match[1], 10);
      if (n > max) max = n;
    }
  }

  return max + 1;
}

/**
 * Find a file matching 'ADR-NNNN' in decisionsDir and move it to archiveDir.
 */
async function moveSupersededAdr(
  adrRef: string,
  decisionsDir: string,
  archiveDir: string
): Promise<void> {
  // adrRef is like 'ADR-0001'; match against NNNN- prefix
  const numMatch = adrRef.match(/(\d+)$/);
  if (!numMatch) return;

  const paddedNum = numMatch[1].padStart(4, '0');

  let entries: string[] = [];
  try {
    entries = await fs.readdir(decisionsDir);
  } catch {
    return;
  }

  const target = entries.find((name) => name.startsWith(paddedNum + '-') && name.endsWith('.md'));
  if (!target) return;

  const srcPath = path.join(decisionsDir, target);
  const destPath = path.join(archiveDir, target);

  try {
    await fs.rename(srcPath, destPath);
  } catch (err: any) {
    // Fall back to copy+delete on EPERM (Windows)
    if (err?.code === 'EPERM' || err?.code === 'EXDEV') {
      await fs.copyFile(srcPath, destPath);
      await fs.rm(srcPath, { force: true });
    } else {
      throw err;
    }
  }
}
