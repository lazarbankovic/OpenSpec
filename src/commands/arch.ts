import { Command } from 'commander';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import chalk from 'chalk';
import { resolveOpenSpecRoot } from '../core/root-selection.js';

// Minimal valid Structurizr DSL stubs for each C4 level
const STUBS: Record<string, string> = {
  'c1.dsl': `workspace "System Context" "C1 - System Context diagram" {

    model {
        # Define people and software systems here
        # Example:
        # user = person "User" "A user of the system"
        # softwareSystem = softwareSystem "Software System" "Description"
        # user -> softwareSystem "Uses"
    }

    views {
        systemContext softwareSystem "SystemContext" {
            include *
            autoLayout
        }

        theme default
    }

}
`,
  'c2.dsl': `workspace "Containers" "C2 - Container diagram" {

    model {
        # Define containers (applications, databases, etc.) inside your software system here
        # Example:
        # softwareSystem = softwareSystem "Software System" {
        #     webApp = container "Web Application" "Serves the frontend" "Node.js"
        #     database = container "Database" "Stores data" "PostgreSQL"
        #     webApp -> database "Reads from and writes to"
        # }
    }

    views {
        container softwareSystem "Containers" {
            include *
            autoLayout
        }

        theme default
    }

}
`,
  'c3.dsl': `workspace "Components" "C3 - Component diagram" {

    model {
        # Define components inside a container here
        # Example:
        # softwareSystem = softwareSystem "Software System" {
        #     webApp = container "Web Application" {
        #         router = component "Router" "Handles HTTP routing" "Express"
        #         controller = component "Controller" "Handles business logic"
        #         router -> controller "Delegates to"
        #     }
        # }
    }

    views {
        component webApp "Components" {
            include *
            autoLayout
        }

        theme default
    }

}
`,
  'c4.dsl': `workspace "Code" "C4 - Code diagram" {

    model {
        # Define code-level elements (classes, interfaces) here
        # This level is rarely needed — use only when class/function-level
        # design is explicitly part of the architectural decision.
    }

    views {
        theme default
    }

}
`,
};

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

      // Write C4 stubs
      for (const [filename, content] of Object.entries(STUBS)) {
        await fs.writeFile(path.join(archDir, filename), content, 'utf-8');
      }

      console.log(chalk.green('✓') + ' Created openspec/arch/ with C4 Structurizr stubs.');
      console.log(
        `\nNext step: set ${chalk.cyan('schema: arch-driven')} in openspec/config.yaml to enable arch tracking in changes.`
      );
    });

  return arch;
}
