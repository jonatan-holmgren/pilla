import { existsSync, rmSync } from "node:fs";
import path from "node:path";

import { checkoutPinnedRepo, listPatches, readFlakeConfig, run, runCapture } from "./shared.js";

const ensureRecreatable = (targetDir: string) => {
  if (!existsSync(path.join(targetDir, ".git"))) {
    throw new Error(`${targetDir} exists but is not a git repo`);
  }

  const dirty = runCapture(["git", "status", "--porcelain"], targetDir);

  if (dirty) {
    throw new Error(`${targetDir} has uncommitted changes; remove it or clean it before rematerializing`);
  }
};

export const materialize = (dir: string, targetName = ".repo") => {
  const config = readFlakeConfig(dir);
  const targetDir = path.join(dir, targetName);

  if (existsSync(targetDir)) {
    ensureRecreatable(targetDir);
    rmSync(targetDir, { recursive: true, force: true });
  }

  checkoutPinnedRepo(config, dir, targetName);

  const patchesDir = path.join(dir, "patches");

  for (const patch of listPatches(patchesDir)) {
    run(["git", "am", path.join(patchesDir, patch)], targetDir);
  }

  console.log(`ready: ${targetDir}`);
};
