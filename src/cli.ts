#!/usr/bin/env node
import { bump } from "./bump.js";
import { edit } from "./edit.js";
import { create } from "./new.js";
import { save } from "./save.js";

const USAGE = `
pillra - patch management for pinned upstream repos

  pillra new <dir>   scaffold a new example with a flake.nix
  pillra edit        clone upstream into .edit/ with patches applied as commits
  pillra save        regenerate patch files from .edit/ and clean up
  pillra bump        advance pinned commit to latest upstream, re-apply patches
`.trim();

// eslint-disable-next-line unicorn/no-unreadable-array-destructuring
const [, , command, ...args] = process.argv;

try {
  switch (command) {
    case "new": {
      if (!args[0]) {
        console.error("usage: pillra new <dir>");
        process.exit(1);
      }

      create(process.cwd(), args[0]);
      break;
    }
    case "edit": { edit(process.cwd());
      break; }
    case "save": { save(process.cwd());
      break; }
    case "bump": { bump(process.cwd());
      break; }
    default: {
      console.log(USAGE);

      if (command) process.exit(1);
    }
  }
}
catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
