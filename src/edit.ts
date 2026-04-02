import { existsSync } from "node:fs";
import path from "node:path";

import { applyPatches, listPatches, readFlakeConfig, run } from "./shared.js";

export const edit = (dir: string) => {
  const config = readFlakeConfig(dir);
  const editDir = path.join(dir, ".edit");

  if (existsSync(editDir)) throw new Error(".edit already exists. Finalize with 'pillra save' or delete it manually.");

  run(["git", "clone", "--filter=blob:none", "--no-checkout", config.repo, ".edit"], dir);
  run(["git", "checkout", config.commit], editDir);
  applyPatches(listPatches(path.join(dir, "patches")), path.join(dir, "patches"), editDir, true);

  console.log(`ready: ${editDir}`);
};
