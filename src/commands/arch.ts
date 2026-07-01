import { Command } from 'commander';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import chalk from 'chalk';
import { resolveOpenSpecRoot } from '../core/root-selection.js';

// Single combined Structurizr DSL stub with all C4 views
const ARCH_FILENAME = 'c4architecture.dsl';
const ARCH_STUB = `workspace "C4 Architecture" {

    model {
        # Define people, software systems, containers, and components here.
        # Example:
        # user = person "User" "A user of the system"
        # softwareSystem = softwareSystem "Software System" "Description" {
        #     webApp = container "Web Application" "Delivers the frontend" "Node.js" {
        #         controller = component "Controller" "Handles requests"
        #     }
        #     database = container "Database" "Stores data" "PostgreSQL"
        #     webApp -> database "Reads/writes"
        # }
        # user -> softwareSystem "Uses"
    }

    views {
        # C1 — System Context: people and external systems
        # systemContext softwareSystem "C1_Context" {
        #     include *
        #     autoLayout
        # }

        # C2 — Containers: applications, databases, services
        # container softwareSystem "C2_Containers" {
        #     include *
        #     autoLayout
        # }

        # C3 — Components: modules inside a container
        # component webApp "C3_Components" {
        #     include *
        #     autoLayout
        # }

        theme default
    }

}
`;



export function createArchCommand(): Command {
  const arch = new Command('arch').description('Architecture tracking commands (C4 diagrams and ADRs)');

  arch
    .command('init')
    .description('Initialize the openspec/arch/ folder with C4 Structurizr DSL stubs')
    .action(async () => {
      let root;
      try {
        root = await resolveOpenSpecRoot();
      } catch (err) {
        console.error(chalk.red(err instanceof Error ? err.message : String(err)));
        process.exitCode = 1;
        return;
      }

      const archDir = path.join(root.path, 'openspec', 'arch');
      const decisionsDir = path.join(archDir, 'decisions');
      const archiveDir = path.join(decisionsDir, 'archive');

      // Check if already initialized
      try {
        await fs.access(archDir);
        console.log(
          chalk.yellow(`openspec/arch/ already exists. Nothing to do.`) +
            `\nTo enable arch tracking, set ${chalk.cyan('schema: arch-driven')} in openspec/config.yaml.`
        );
        return;
      } catch {
        // Not yet initialized — proceed
      }

      await fs.mkdir(archDir, { recursive: true });
      await fs.mkdir(decisionsDir, { recursive: true });
      await fs.mkdir(archiveDir, { recursive: true });

      // Write .gitkeep files so the empty directories are committed
      await fs.writeFile(path.join(decisionsDir, '.gitkeep'), '', 'utf-8');
      await fs.writeFile(path.join(archiveDir, '.gitkeep'), '', 'utf-8');

      // Write the single combined C4 architecture file
      await fs.writeFile(path.join(archDir, ARCH_FILENAME), ARCH_STUB, 'utf-8');

      console.log(chalk.green('✓') + ` Created openspec/arch/${ARCH_FILENAME} with C4 Structurizr stubs.`);
      console.log(
        `\nNext step: set ${chalk.cyan('schema: arch-driven')} in openspec/config.yaml to enable arch tracking in changes.`
      );
    });

  return arch;
}
