import { execFileSync, execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export type UpstreamConfig = {
  repo: string;
  commit: string;
  branch?: string;
};

const childEnv = { ...process.env, COREPACK_ENABLE_STRICT: "0" };

export const run = (args: string[], cwd: string) => {
  execFileSync(args[0], args.slice(1), { cwd, stdio: "inherit", env: childEnv });
};

export const runCapture = (args: string[], cwd: string): string =>
  execFileSync(args[0], args.slice(1), { cwd, encoding: "utf8", env: childEnv }).trim();

const parseFlakeVar = (content: string, name: string): string | undefined =>
  content.match(new RegExp(`${name}\\s*=\\s*"(.+)";`))?.[1]?.trim();

export const readFlakeConfig = (dir: string): UpstreamConfig => {
  const flakePath = path.join(dir, "flake.nix");

  if (!existsSync(flakePath)) throw new Error(`No flake.nix found in: ${dir}`);

  const content = readFileSync(flakePath, "utf8");
  const repo = parseFlakeVar(content, "upstreamRepo");
  const commit = parseFlakeVar(content, "upstreamCommit");
  const branch = parseFlakeVar(content, "upstreamBranch");

  if (!repo) throw new Error("upstreamRepo not found in flake.nix");
  if (!commit) throw new Error("upstreamCommit not found in flake.nix");

  return { repo, commit, branch };
};

export const writeFlakeCommit = (dir: string, newCommit: string) => {
  const flakePath = path.join(dir, "flake.nix");
  const content = readFileSync(flakePath, "utf8");

  writeFileSync(flakePath, content.replace(/upstreamCommit\s*=\s*".+";/, `upstreamCommit = "${newCommit}";`));
};

export const promptInput = (question: string, defaultValue?: string): string => {
  process.stdout.write(defaultValue ? `${question} [${defaultValue}]: ` : `${question}: `);
  const answer = execSync("head -1 /dev/tty", { encoding: "utf8" }).trim();

  return answer || defaultValue || "";
};

export const resolveLatestCommit = (repo: string, branch: string): string => {
  const result = runCapture(["git", "ls-remote", repo, `refs/heads/${branch}`], process.cwd());
  const commit = result.split("\t")[0]?.trim();

  if (!commit) throw new Error(`Could not resolve ${branch} on ${repo}`);

  return commit;
};

export const listPatches = (patchesDir: string): string[] => {
  if (!existsSync(patchesDir)) return [];

  return readdirSync(patchesDir).filter(f => f.endsWith(".patch")).sort();
};

export const applyPatches = (patches: string[], patchesDir: string, targetDir: string, asCommits = false) => {
  for (const patch of patches)
    run(asCommits ? ["git", "am", path.join(patchesDir, patch)] : ["git", "apply", path.join(patchesDir, patch)], targetDir);
};
