<p align="center">
  <h1>pillra</h1>
  <p>Pin upstream commits, manage patches, and keep your Nix devShell in sync.</p>
</p>

Pin an upstream commit, store your changes as `.patch` files, and let your Nix devShell handle the rest. No forks, no diverging branches. Just explicit, reviewable diffs on top of a locked upstream.

## Install

```sh
pnpm install -g pillra
# or
bun add -g pillra
```

## Concept

Each example lives in its own directory with a `flake.nix` that declares the upstream repo, commit, and branch, plus a `patches/` directory. Pillra owns upstream checkout materialization for both `.edit/` and `.repo/`, using a shared cached upstream checkout and detached worktrees, while the flake provides the toolchain and any example-specific bootstrap logic.

```
my-project/
  some-app/
    flake.nix       ← upstream config + dev environment
    patches/
      0001-add-feature.patch
    .edit/          ← ephemeral edit session (gitignored)
```

## flake.nix convention

Pillra reads and updates three variables in your `flake.nix`:

```nix
upstreamRepo   = "https://github.com/org/repo";
upstreamCommit = "abc123...";
upstreamBranch = "main";          # optional, required for bump
```

## Commands

All commands run in the current directory (the example directory).

### `pillra new <dir>`

Scaffold a new example directory. Prompts for repo URL and branch, resolves the latest commit automatically.

```sh
pillra new some-app
```

Creates `<dir>/flake.nix` and `<dir>/patches/`.

### `pillra clone [target]`

Clone upstream into `.repo/` at the pinned commit without applying patches.

```sh
cd some-app
pillra clone
```

### `pillra materialize [target]`

Clone upstream into `.repo/` with patches applied as commits, ready to run.

```sh
cd some-app
pillra materialize
```

### `pillra edit`

Clone upstream into `.edit/` with existing patches applied as commits, ready to modify.

```sh
cd some-app
pillra edit
```

Make changes and `git commit` in `.edit/`. Each commit becomes one patch file. Run `pillra save` when done.

### `pillra save`

Regenerate patch files from commits in `.edit/` and clean up.

```sh
pillra save
```

Fails if `.edit/` has uncommitted changes.

### `pillra bump`

Advance the pinned commit to the latest upstream and re-apply patches.

```sh
pillra bump
```

Updates `upstreamCommit` in `flake.nix`, clones the new base into `.edit/`, and applies patches. On conflict, resolve with `git am --continue` then run `pillra save`.

## Workflow

```sh
# First time
pillra new myapp         # creates myapp/ with flake.nix and patches/
cd myapp
# edit flake.nix to add packages and run commands

# Authoring patches
pillra edit              # clones upstream into .edit/ with patches as commits
# make changes and git commit in .edit/
pillra save              # regenerate patch files, clean up .edit/

# Tracking a new upstream commit
pillra bump              # fetches latest, sets up .edit/ at new base
# resolve conflicts if any, then:
pillra save

# Entering the dev environment
nix develop              # shellHook can call `pillra materialize` and bootstrap
```

Commit `flake.nix` and `patches/`. Add `.edit/` to `.gitignore`.
