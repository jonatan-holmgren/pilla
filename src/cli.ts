#!/usr/bin/env node
import { bump } from "./bump.js";
import { edit } from "./edit.js";
import { setup } from "./setup.js";

const USAGE = `
pillra - maintain patches on top of pinned upstream git repos

Usage:
  pillra setup [app]   Clone and apply patches (all apps, or one by name)
  pillra edit <app>    Open an interactive edit session to update patches
  pillra bump <app>    Advance pinned commit to latest upstream and re-apply patches

Each app is a directory containing an app.json:
  {
    "repo":   "https://github.com/org/repo",
    "commit": "<sha>",
    "branch": "main",          // required for bump
    "setup":  "yarn install",  // optional post-setup command
    "patches": "patches"       // optional custom patches directory
  }
`.trim();

// eslint-disable-next-line unicorn/no-unreadable-array-destructuring
const [, , command, ...args] = process.argv;
const root = process.cwd();

try {
  switch (command) {
    case "setup": {
      setup(root, args[0]);
      break;
    }
    case "edit": {
      const app = args[0];

      if (!app) {
        console.error("Usage: pillra edit <app>");
        process.exit(1);
      }

      edit(root, app);
      break;
    }
    case "bump": {
      const app = args[0];

      if (!app) {
        console.error("Usage: pillra bump <app>");
        process.exit(1);
      }

      bump(root, app);
      break;
    }
    default: {
      console.log(USAGE);

      if (command) process.exit(1);

      break;
    }
  }
}
catch (error) {
  console.error(`\nError: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
}
