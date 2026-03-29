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

const parseArg = (content: string, name: string): string | undefined =>
  content.match(new RegExp(`^ARG ${name}=(.+)$`, "m"))?.[1]?.trim();

export const readDockerfileConfig = (dir: string): UpstreamConfig => {
  const dockerfilePath = path.join(dir, "Dockerfile");

  if (!existsSync(dockerfilePath)) throw new Error(`No Dockerfile found in: ${dir}`);

  const content = readFileSync(dockerfilePath, "utf8");
  const repo = parseArg(content, "UPSTREAM_REPO");
  const commit = parseArg(content, "UPSTREAM_COMMIT");
  const branch = parseArg(content, "UPSTREAM_BRANCH");

  if (!repo) throw new Error("UPSTREAM_REPO ARG not found in Dockerfile");

  if (!commit) throw new Error("UPSTREAM_COMMIT ARG not found in Dockerfile");

  return { repo, commit, branch };
};

export const writeDockerfileCommit = (dir: string, newCommit: string) => {
  const dockerfilePath = path.join(dir, "Dockerfile");
  const content = readFileSync(dockerfilePath, "utf8");

  writeFileSync(dockerfilePath, content.replace(/^ARG UPSTREAM_COMMIT=.+$/m, `ARG UPSTREAM_COMMIT=${newCommit}`));
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

  return readdirSync(patchesDir).filter(f => f.endsWith(".patch"))
    .sort();
};

export const applyPatches = (patches: string[], patchesDir: string, targetDir: string, asCommits = false) => {
  for (const patch of patches)
    run(asCommits ? ["git", "am", path.join(patchesDir, patch)] : ["git", "apply", path.join(patchesDir, patch)], targetDir);
};
