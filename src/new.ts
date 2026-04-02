import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { promptInput, resolveLatestCommit } from "./shared.js";

const flake = (repo: string, commit: string, branch: string) => `\
{
  description = "patched upstream";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }: let
    upstreamRepo = "${repo}";
    upstreamCommit = "${commit}";
    upstreamBranch = "${branch}";

    systems = [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ];
    forEachSystem = f: nixpkgs.lib.genAttrs systems (system: f nixpkgs.legacyPackages.\${system});
  in {
    devShells = forEachSystem (pkgs: {
      default = pkgs.mkShell {
        packages = [ pkgs.git pkgs.nodejs_20 ];
        shellHook = ''
          if [ ! -d .repo ]; then
            git clone \${upstreamRepo} .repo
            git -C .repo checkout \${upstreamCommit}
            for patch in $(find patches -name "*.patch" | sort); do
              git -C .repo apply "$patch"
            done
          fi
        '';
      };
    });
  };
}
`;

export const create = (root: string, name: string) => {
  const dir = path.resolve(root, name);

  if (existsSync(path.join(dir, "flake.nix"))) throw new Error(`flake.nix already exists in ${dir}`);

  const repo = promptInput("repo");

  if (!repo) throw new Error("repo is required");

  const branch = promptInput("branch", "main");
  const commit = resolveLatestCommit(repo, branch);

  mkdirSync(path.join(dir, "patches"), { recursive: true });
  writeFileSync(path.join(dir, "flake.nix"), flake(repo, commit, branch));

  console.log(`created ${dir} @ ${commit.slice(0, 8)}`);
};
