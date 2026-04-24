import { existsSync } from "node:fs";
import path from "node:path";

import { checkoutPinnedRepo, readFlakeConfig } from "./shared.js";

export const clone = (dir: string, targetName = ".repo") => {
  const config = readFlakeConfig(dir);
  const targetDir = path.join(dir, targetName);

  if (existsSync(targetDir)) {
    throw new Error(`${targetDir} already exists`);
  }

  checkoutPinnedRepo(config, dir, targetName);
  console.log(`ready: ${targetDir}`);
};
