import { existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";

import { readFlakeConfig, runCapture } from "./shared.js";

export const save = (dir: string) => {
  const config = readFlakeConfig(dir);
  const editDir = path.join(dir, ".edit");
  const patchesDir = path.join(dir, "patches");

  if (!existsSync(editDir)) throw new Error("no .edit session found, run 'pillra edit' first");

  const dirty = runCapture(["git", "status", "--porcelain"], editDir);

  if (dirty) throw new Error(`.edit has uncommitted changes:\n\n${dirty}`);

  mkdirSync(patchesDir, { recursive: true });

  const result = runCapture(
    ["git", "format-patch", config.commit, "--output-directory", patchesDir, "--zero-commit", "--no-signature"],
    editDir,
  );

  const generated = result ? result.split("\n").map(p => path.basename(p)) : [];
  const generatedSet = new Set(generated);

  readdirSync(patchesDir)
    .filter(f => f.endsWith(".patch") && !generatedSet.has(f))
    .forEach(f => rmSync(path.join(patchesDir, f)));

  rmSync(editDir, { recursive: true, force: true });

  if (generated.length === 0) console.log("no patches");
  else generated.forEach(p => console.log(p));
};
