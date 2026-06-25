import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

describe('arch command', () => {
  let tempDir: string;
  let originalCwd: string;
  let originalEnv: NodeJS.ProcessEnv;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tempDir = path.join(
      os.tmpdir(),
      `openspec-arch-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
    );
    fs.mkdirSync(tempDir, { recursive: true });

    // openspec/changes/ gives the root a "planning shape"
    fs.mkdirSync(path.join(tempDir, 'openspec', 'changes'), { recursive: true });

    originalCwd = process.cwd();
    originalEnv = { ...process.env };
    process.chdir(tempDir);

    process.env.XDG_DATA_HOME = path.join(tempDir, 'xdg-data');
    process.env.XDG_CONFIG_HOME = path.join(tempDir, 'xdg-config');

    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.chdir(originalCwd);
    process.env = originalEnv;
    fs.rmSync(tempDir, { recursive: true, force: true });
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    vi.resetModules();
  });

  describe('arch init', () => {
    it('creates openspec/arch/ with four Structurizr stubs', async () => {
      const { createArchCommand } = await import('../../src/commands/arch.js');
      const cmd = createArchCommand();
      await cmd.parseAsync(['node', 'openspec', 'init']);

      const archDir = path.join(tempDir, 'openspec', 'arch');
      for (const layer of ['c1.dsl', 'c2.dsl', 'c3.dsl', 'c4.dsl']) {
        expect(fs.existsSync(path.join(archDir, layer)), `${layer} should exist`).toBe(true);
        const content = fs.readFileSync(path.join(archDir, layer), 'utf-8');
        expect(content).toContain('workspace');
      }
    });

    it('creates decisions/ and decisions/archive/ with .gitkeep', async () => {
      const { createArchCommand } = await import('../../src/commands/arch.js');
      const cmd = createArchCommand();
      await cmd.parseAsync(['node', 'openspec', 'init']);

      const archDir = path.join(tempDir, 'openspec', 'arch');
      expect(fs.existsSync(path.join(archDir, 'decisions', '.gitkeep'))).toBe(true);
      expect(fs.existsSync(path.join(archDir, 'decisions', 'archive', '.gitkeep'))).toBe(true);
    });

    it('is idempotent: second run prints a message and leaves files unchanged', async () => {
      const { createArchCommand } = await import('../../src/commands/arch.js');

      // First run
      const cmd1 = createArchCommand();
      await cmd1.parseAsync(['node', 'openspec', 'init']);

      // Write a marker into c1 so we can detect if it gets overwritten
      const c1Path = path.join(tempDir, 'openspec', 'arch', 'c1.dsl');
      fs.writeFileSync(c1Path, '# sentinel', 'utf-8');

      // Second run
      const cmd2 = createArchCommand();
      await cmd2.parseAsync(['node', 'openspec', 'init']);

      // File unchanged, and console.log was called (idempotent message)
      expect(fs.readFileSync(c1Path, 'utf-8')).toBe('# sentinel');
      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls.map((c) => c.join(' ')).join('\n');
      expect(output).toContain('already exists');
    });
  });
});
