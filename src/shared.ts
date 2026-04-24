import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import * as readline from "node:readline";

export type UpstreamConfig = {
  repo: string;
  commit: string;
  branch?: string;
};

const cacheRoot = () => {
  if (process.env.XDG_CACHE_HOME) return path.join(process.env.XDG_CACHE_HOME, "pillra");

  if (process.env.LOCALAPPDATA) return path.join(process.env.LOCALAPPDATA, "pillra");

  if (process.platform === "darwin") return path.join(os.homedir(), "Library", "Caches", "pillra");

  return path.join(os.homedir(), ".cache", "pillra");
};

const repoCacheDir = (repo: string) => {
  const hash = createHash("sha256").update(repo)
    .digest("hex")
    .slice(0, 12);
  const repoName = path.basename(repo, ".git").replaceAll(/[^a-zA-Z0-9._-]/g, "-");

  return path.join(cacheRoot(), "repos", `${repoName}-${hash}.git`);
};

const cloneArgs = (config: UpstreamConfig, targetDir: string) => {
  const args = ["git", "clone", "--bare", "--filter=blob:none", "--no-tags"];

  if (config.branch) {
    args.push("--single-branch", "--branch", config.branch);
  }

  args.push(config.repo, targetDir);

  return args;
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

export const promptInput = (question: string, defaultValue?: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const prompt = defaultValue ? `${question} [${defaultValue}]: ` : `${question}: `;

    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer.trim() || defaultValue || "");
    });

    rl.on("SIGINT", () => {
      rl.close();
      reject(new Error("cancelled"));
    });
  });

export const resolveLatestCommit = (repo: string, branch: string): string => {
  const result = runCapture(["git", "ls-remote", repo, `refs/heads/${branch}`], process.cwd());
  const commit = result.split("\t")[0]?.trim();

  if (!commit) throw new Error(`Could not resolve ${branch} on ${repo}`);

  return commit;
};

export const listPatches = (patchesDir: string): string[] => {
  if (!existsSync(patchesDir)) return [];

  return readdirSync(patchesDir).filter(f => f.endsWith(".patch"))
    .sort();
};

export const applyPatches = (patches: string[], patchesDir: string, targetDir: string, asCommits = false) => {
  for (const patch of patches)
    run(asCommits ? ["git", "am", path.join(patchesDir, patch)] : ["git", "apply", path.join(patchesDir, patch)], targetDir);
};

export const checkoutPinnedRepo = (config: UpstreamConfig, dir: string, targetName: string) => {
  const cacheDir = repoCacheDir(config.repo);

  mkdirSync(path.dirname(cacheDir), { recursive: true });

  if (!existsSync(cacheDir)) {
    run(cloneArgs(config, cacheDir), dir);
  }
  else if (config.branch) {
    run(["git", "fetch", "--force", "--prune", "--filter=blob:none", "--no-tags", "origin", `refs/heads/${config.branch}:refs/heads/${config.branch}`], cacheDir);
  }
  else {
    run(["git", "fetch", "--force", "--prune", "--filter=blob:none", "--no-tags", "origin"], cacheDir);
  }

  run(["git", "worktree", "prune"], cacheDir);
  run(["git", "worktree", "add", "--detach", path.join(dir, targetName), config.commit], cacheDir);
};
