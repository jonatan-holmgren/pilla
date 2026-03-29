import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { promptInput, resolveLatestCommit } from "./shared.js";

const dockerfile = (repo: string, commit: string, branch: string) => `\
FROM node:20-alpine

ARG UPSTREAM_REPO=${repo}
ARG UPSTREAM_COMMIT=${commit}
ARG UPSTREAM_BRANCH=${branch}

RUN apk add --no-cache git

RUN git clone $UPSTREAM_REPO /app
RUN git -C /app checkout $UPSTREAM_COMMIT

WORKDIR /app
COPY patches/ /patches/
RUN find /patches -name "*.patch" | sort | xargs -r git apply

# RUN npm install
# CMD ["npm", "start"]
`;

export const create = (root: string, name: string) => {
  const dir = path.resolve(root, name);

  if (existsSync(path.join(dir, "Dockerfile"))) throw new Error(`Dockerfile already exists in ${dir}`);

  const repo = promptInput("repo");

  if (!repo) throw new Error("repo is required");

  const branch = promptInput("branch", "main");
  const commit = resolveLatestCommit(repo, branch);

  mkdirSync(path.join(dir, "patches"), { recursive: true });
  writeFileSync(path.join(dir, "Dockerfile"), dockerfile(repo, commit, branch));

  console.log(`created ${dir} @ ${commit.slice(0, 8)}`);
};
