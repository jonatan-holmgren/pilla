import { existsSync } from "node:fs";
import path from "node:path";

import { applyPatches, checkoutPinnedRepo, listPatches, readFlakeConfig } from "./shared.js";

export const edit = (dir: string) => {
  const config = readFlakeConfig(dir);
  const editDir = path.join(dir, ".edit");

  if (existsSync(editDir)) throw new Error(".edit already exists. Finalize with 'pillra save' or delete it manually.");

  checkoutPinnedRepo(config, dir, ".edit");
  applyPatches(listPatches(path.join(dir, "patches")), path.join(dir, "patches"), editDir, true);

  console.log(`ready: ${editDir}`);
};
