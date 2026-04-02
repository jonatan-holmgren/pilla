import { existsSync } from "node:fs";
import path from "node:path";

import { listPatches, readFlakeConfig, resolveLatestCommit, run, writeFlakeCommit } from "./shared.js";

export const bump = (dir: string) => {
  const config = readFlakeConfig(dir);

  if (!config.branch) throw new Error("upstreamBranch not set in flake.nix");

  const latest = resolveLatestCommit(config.repo, config.branch);

  if (latest === config.commit) {
    console.log(`already at ${latest.slice(0, 8)}`);

    return;
  }

  console.log(`${config.commit.slice(0, 8)} → ${latest.slice(0, 8)}`);

  const editDir = path.join(dir, ".edit");

  if (existsSync(editDir)) throw new Error(".edit already exists. Finalize with 'pillra save' or delete it manually.");

  writeFlakeCommit(dir, latest);

  run(["git", "clone", "--filter=blob:none", "--no-checkout", config.repo, ".edit"], dir);
  run(["git", "checkout", latest], editDir);

  const patchesDir = path.join(dir, "patches");

  for (const patch of listPatches(patchesDir)) {
    try {
      run(["git", "am", path.join(patchesDir, patch)], editDir);
    }
    catch {
      console.error(`conflict: ${patch}\nresolve, run 'git am --continue', then 'pillra save'`);

      return;
    }
  }

  console.log(`ready: ${editDir}`);
};
