# Releasing

Same shape as MiniMax for Copilot: CI on every push, VSIX on tags, marketplace publish only on purpose.

## Everyday push

```bash
pnpm push
```

Pushes the current branch to `origin`.

```bash
pnpm push:all
```

Pushes the current commit and every local tag.

## Cut a GitHub Release + VSIX

1. Land the version you want on `main` (`package.json` version is the source of truth).
2. Tag and push:

```bash
pnpm release:push
```

That is `git tag v<version>` plus `git push origin HEAD` and `git push origin v<version>`.

The Release workflow then:

- builds the Windows x64 VSIX (`pnpm package`)
- attaches `dist-vsix/*.vsix` to the GitHub Release for that tag
- uses the matching `CHANGELOG.md` section as the release body

Manual equivalent:

```bash
git tag -a v0.1.0 -m v0.1.0
git push origin HEAD
git push origin v0.1.0
```

## Conventional-commit cuts (release-please)

Pushes to `main` also run release-please. When it opens (or updates) a release PR and that PR merges, it tags `vX.Y.Z` and the same package job attaches the VSIX.

Use conventional commits (`feat:`, `fix:`, …) if you want that path.

## Marketplace publish (opt-in)

Publishing is irreversible. It is **not** tied to tag pushes.

```bash
gh workflow run release.yml --repo openlapp/lapp-for-copilot -f ref=v0.1.0
```

Requires the `VSCE_PAT` repository secret.
