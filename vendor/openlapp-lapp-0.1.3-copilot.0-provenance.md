# Provenance: @openlapp/lapp 0.1.3-copilot.0

Immutable review record for the uncommitted Copilot-facing SDK prerelease in this isolated worktree. These artifacts do not modify SDK source.

## Base commit

- SHA: `6fbd6ead1dbd9781d29788c2ea386e63cb7d2828`
- Subject: feat(lapp): add source priority and extended usage controls
- Worktree HEAD: `6fbd6ead1dbd9781d29788c2ea386e63cb7d2828` (same as base; prerelease changes are uncommitted)

## Scope

The patch is a binary-safe `git diff --cached --binary --full-index` of every SDK prerelease change required to rebuild the vendored package from the base commit. It includes previously untracked new files. The generated package tarball is not part of the patch.

### Modified files (11)

- `CHANGELOG.md`
- `docs/sdk.md`
- `package.json`
- `packages/lapp/docs/api.md`
- `packages/lapp/package.json`
- `packages/lapp/src/client/index.ts`
- `packages/lapp/src/index.ts`
- `packages/lapp/src/manager/contract.ts`
- `packages/lapp/src/manager/host.ts`
- `packages/lapp/src/sync/index.ts`
- `packages/lapp/test/manager-contract.test.ts`

### New / previously untracked files (9)

- `packages/lapp/src/client/normalized/index.ts`
- `packages/lapp/src/client/normalized/map.ts`
- `packages/lapp/src/client/normalized/parse.ts`
- `packages/lapp/src/client/normalized/tool-choice.ts`
- `packages/lapp/src/client/normalized/types.ts`
- `packages/lapp/src/client/normalized/validate.ts`
- `packages/lapp/src/manager/previews.ts`
- `packages/lapp/test/manager-host-v2.test.ts`
- `packages/lapp/test/normalized-contract.test.ts`

### Source archive

Archive root directory: `openlapp-lapp-0.1.3-copilot.0-source/`

Included: package manifests, `pnpm-lock.yaml`, workspace/build/test config, scripts, docs, tests, SDK source, vendored schemas/spec/conformance (except names excluded below), licenses, and user-agreement files needed to audit and rebuild.

Excluded: `node_modules`, `.git`, generated `dist`, existing `*.tgz`, `.codegraph`, secrets (`.env`, `auth.json`), and these provenance artifacts themselves.

Note: conformance fixtures named `auth.json` exist unchanged in the base commit and are omitted from this archive by review policy. They are not required to apply the patch or to compile the SDK; they remain available from `6fbd6ead1dbd9781d29788c2ea386e63cb7d2828`.

File count in archive: 315

### Source archive inventory

- `.gitattributes`
- `.github/workflows/ci.yml`
- `.github/workflows/release.yml`
- `.gitignore`
- `.npmrc`
- `CHANGELOG.md`
- `CLAUDE.md`
- `LICENSE`
- `README.md`
- `README_zh.md`
- `dev/registry/README.md`
- `dev/registry/compose.yaml`
- `dev/registry/config.yaml`
- `docs/configuration.md`
- `docs/getting-started.md`
- `docs/internal/CLAUDE.md`
- `docs/internal/README.md`
- `docs/local-providers.md`
- `docs/protocols.md`
- `docs/sdk.md`
- `docs/security.md`
- `docs/troubleshooting.md`
- `docs/zh/configuration.md`
- `docs/zh/getting-started.md`
- `docs/zh/local-providers.md`
- `docs/zh/protocols.md`
- `docs/zh/sdk.md`
- `docs/zh/security.md`
- `docs/zh/troubleshooting.md`
- `examples/electron-manager/README.md`
- `examples/electron-manager/channels.ts`
- `examples/electron-manager/main.ts`
- `examples/electron-manager/preload.ts`
- `examples/electron-manager/renderer-bridge.ts`
- `examples/electron-manager/renderer.d.ts`
- `package.json`
- `packages/lapp/LICENSE`
- `packages/lapp/README.md`
- `packages/lapp/USER_AGREEMENT.en.md`
- `packages/lapp/USER_AGREEMENT.zh-CN.md`
- `packages/lapp/conformance/generation-v1.json`
- `packages/lapp/conformance/profiles/examples/en/full/.lapp/global.json`
- `packages/lapp/conformance/profiles/examples/en/full/.lapp/providers/deepseek/models.json`
- `packages/lapp/conformance/profiles/examples/en/full/.lapp/providers/deepseek/provider.json`
- `packages/lapp/conformance/profiles/examples/en/full/.lapp/providers/media-compatible/models.json`
- `packages/lapp/conformance/profiles/examples/en/full/.lapp/providers/media-compatible/provider.json`
- `packages/lapp/conformance/profiles/examples/en/full/.lapp/providers/moonshot-kimi/models.json`
- `packages/lapp/conformance/profiles/examples/en/full/.lapp/providers/moonshot-kimi/provider.json`
- `packages/lapp/conformance/profiles/examples/en/full/.lapp/providers/siliconflow/models.json`
- `packages/lapp/conformance/profiles/examples/en/full/.lapp/providers/siliconflow/provider.json`
- `packages/lapp/conformance/profiles/examples/en/minimal/.lapp/providers/deepseek/models.json`
- `packages/lapp/conformance/profiles/examples/en/minimal/.lapp/providers/deepseek/provider.json`
- `packages/lapp/conformance/profiles/examples/zh-CN/full/.lapp/global.json`
- `packages/lapp/conformance/profiles/examples/zh-CN/full/.lapp/providers/deepseek/models.json`
- `packages/lapp/conformance/profiles/examples/zh-CN/full/.lapp/providers/deepseek/provider.json`
- `packages/lapp/conformance/profiles/examples/zh-CN/full/.lapp/providers/media-compatible/models.json`
- `packages/lapp/conformance/profiles/examples/zh-CN/full/.lapp/providers/media-compatible/provider.json`
- `packages/lapp/conformance/profiles/examples/zh-CN/full/.lapp/providers/moonshot-kimi/models.json`
- `packages/lapp/conformance/profiles/examples/zh-CN/full/.lapp/providers/moonshot-kimi/provider.json`
- `packages/lapp/conformance/profiles/examples/zh-CN/full/.lapp/providers/siliconflow/models.json`
- `packages/lapp/conformance/profiles/examples/zh-CN/full/.lapp/providers/siliconflow/provider.json`
- `packages/lapp/conformance/profiles/examples/zh-CN/minimal/.lapp/providers/deepseek/models.json`
- `packages/lapp/conformance/profiles/examples/zh-CN/minimal/.lapp/providers/deepseek/provider.json`
- `packages/lapp/conformance/profiles/invalid/auth-alias-default/.lapp/auth/subscription/models.json`
- `packages/lapp/conformance/profiles/invalid/auth-alias-default/.lapp/global.json`
- `packages/lapp/conformance/profiles/invalid/auth-directory-mismatch/.lapp/auth/wrong/models.json`
- `packages/lapp/conformance/profiles/invalid/auth-directory-mismatch/.lapp/global.json`
- `packages/lapp/conformance/profiles/invalid/auth-model-protocol/.lapp/auth/subscription/models.json`
- `packages/lapp/conformance/profiles/invalid/auth-model-protocol/.lapp/global.json`
- `packages/lapp/conformance/profiles/invalid/auth-models-sensitive-extensions/.lapp/auth/subscription/models.json`
- `packages/lapp/conformance/profiles/invalid/auth-models-sensitive-extensions/.lapp/global.json`
- `packages/lapp/conformance/profiles/invalid/auth-requires-global-1-1/.lapp/auth/subscription/models.json`
- `packages/lapp/conformance/profiles/invalid/auth-requires-global-1-1/.lapp/global.json`
- `packages/lapp/conformance/profiles/invalid/auth-requires-global-1-1/.lapp/providers/demo/models.json`
- `packages/lapp/conformance/profiles/invalid/auth-requires-global-1-1/.lapp/providers/demo/provider.json`
- `packages/lapp/conformance/profiles/invalid/auth-sensitive-config/.lapp/auth/subscription/models.json`
- `packages/lapp/conformance/profiles/invalid/auth-sensitive-config/.lapp/global.json`
- `packages/lapp/conformance/profiles/invalid/auth-sensitive-extensions/.lapp/auth/subscription/models.json`
- `packages/lapp/conformance/profiles/invalid/auth-sensitive-extensions/.lapp/global.json`
- `packages/lapp/conformance/profiles/invalid/auth-unsupported-jsonc/.lapp/auth/subscription/auth.jsonc`
- `packages/lapp/conformance/profiles/invalid/auth-unsupported-jsonc/.lapp/auth/subscription/models.json`
- `packages/lapp/conformance/profiles/invalid/auth-unsupported-jsonc/.lapp/global.json`
- `packages/lapp/conformance/profiles/invalid/bad-global-auth-both/.lapp/auth/primary/models.json`
- `packages/lapp/conformance/profiles/invalid/bad-global-auth-both/.lapp/global.json`
- `packages/lapp/conformance/profiles/invalid/bad-global-auth-both/.lapp/providers/primary/models.json`
- `packages/lapp/conformance/profiles/invalid/bad-global-auth-both/.lapp/providers/primary/provider.json`
- `packages/lapp/conformance/profiles/invalid/bad-global-auth-neither/.lapp/auth/primary/models.json`
- `packages/lapp/conformance/profiles/invalid/bad-global-auth-neither/.lapp/global.json`
- `packages/lapp/conformance/profiles/invalid/bad-global-auth-reference/.lapp/auth/present/models.json`
- `packages/lapp/conformance/profiles/invalid/bad-global-auth-reference/.lapp/global.json`
- `packages/lapp/conformance/profiles/invalid/bad-global-reference/.lapp/global.json`
- `packages/lapp/conformance/profiles/invalid/bad-global-reference/.lapp/providers/deepseek/provider.json`
- `packages/lapp/conformance/profiles/invalid/bad-json/.lapp/providers/deepseek/provider.json`
- `packages/lapp/conformance/profiles/invalid/bad-model-protocol/.lapp/providers/deepseek/models.json`
- `packages/lapp/conformance/profiles/invalid/bad-model-protocol/.lapp/providers/deepseek/provider.json`
- `packages/lapp/conformance/profiles/invalid/cross-origin-discovery/.lapp/providers/deepseek/provider.json`
- `packages/lapp/conformance/profiles/invalid/directory-mismatch/.lapp/providers/wrong/provider.json`
- `packages/lapp/conformance/profiles/invalid/disabled-auth-default/.lapp/auth/disabled/models.json`
- `packages/lapp/conformance/profiles/invalid/disabled-auth-default/.lapp/global.json`
- `packages/lapp/conformance/profiles/invalid/disabled-default/.lapp/global.json`
- `packages/lapp/conformance/profiles/invalid/disabled-default/.lapp/providers/deepseek/models.json`
- `packages/lapp/conformance/profiles/invalid/disabled-default/.lapp/providers/deepseek/provider.json`
- `packages/lapp/conformance/profiles/invalid/duplicate-identities/.lapp/providers/deepseek/models.json`
- `packages/lapp/conformance/profiles/invalid/duplicate-identities/.lapp/providers/deepseek/provider.json`
- `packages/lapp/conformance/profiles/invalid/duplicate-request-headers/.lapp/providers/demo/models.json`
- `packages/lapp/conformance/profiles/invalid/duplicate-request-headers/.lapp/providers/demo/provider.json`
- `packages/lapp/conformance/profiles/invalid/empty-url-components/.lapp/providers/empty-fragment/models.json`
- `packages/lapp/conformance/profiles/invalid/empty-url-components/.lapp/providers/empty-fragment/provider.json`
- `packages/lapp/conformance/profiles/invalid/empty-url-components/.lapp/providers/empty-userinfo/models.json`
- `packages/lapp/conformance/profiles/invalid/empty-url-components/.lapp/providers/empty-userinfo/provider.json`
- `packages/lapp/conformance/profiles/invalid/ijson-duplicate-key/.lapp/providers/demo/models.json`
- `packages/lapp/conformance/profiles/invalid/ijson-duplicate-key/.lapp/providers/demo/provider.json`
- `packages/lapp/conformance/profiles/invalid/ijson-invalid-unicode/.lapp/providers/demo/models.json`
- `packages/lapp/conformance/profiles/invalid/ijson-invalid-unicode/.lapp/providers/demo/provider.json`
- `packages/lapp/conformance/profiles/invalid/ijson-nonfinite-number/.lapp/providers/demo/models.json`
- `packages/lapp/conformance/profiles/invalid/ijson-nonfinite-number/.lapp/providers/demo/provider.json`
- `packages/lapp/conformance/profiles/invalid/ijson-unsafe-integer/.lapp/providers/demo/models.json`
- `packages/lapp/conformance/profiles/invalid/ijson-unsafe-integer/.lapp/providers/demo/provider.json`
- `packages/lapp/conformance/profiles/invalid/ijson-unsafe-integer/.lapp/providers/models/models.json`
- `packages/lapp/conformance/profiles/invalid/ijson-unsafe-integer/.lapp/providers/models/provider.json`
- `packages/lapp/conformance/profiles/invalid/missing-auth-document/.lapp/auth/subscription/models.json`
- `packages/lapp/conformance/profiles/invalid/missing-auth-document/.lapp/global.json`
- `packages/lapp/conformance/profiles/invalid/missing-base-url/.lapp/providers/deepseek/provider.json`
- `packages/lapp/conformance/profiles/invalid/missing-providers/.lapp/README.md`
- `packages/lapp/conformance/profiles/invalid/non-regular-auth-document/.lapp/auth/subscription/models.json`
- `packages/lapp/conformance/profiles/invalid/non-regular-auth-document/.lapp/global.json`
- `packages/lapp/conformance/profiles/invalid/non-regular-managed-file/.lapp/providers/demo/models.json`
- `packages/lapp/conformance/profiles/invalid/non-regular-managed-file/.lapp/providers/demo/provider.json/.keep`
- `packages/lapp/conformance/profiles/invalid/null-provider/.lapp/providers/broken/models.json`
- `packages/lapp/conformance/profiles/invalid/null-provider/.lapp/providers/broken/provider.json`
- `packages/lapp/conformance/profiles/invalid/provider-type/.lapp/providers/demo/models.json`
- `packages/lapp/conformance/profiles/invalid/provider-type/.lapp/providers/demo/provider.json`
- `packages/lapp/conformance/profiles/invalid/reserved-provider-id/.lapp/providers/reserved/models.json`
- `packages/lapp/conformance/profiles/invalid/reserved-provider-id/.lapp/providers/reserved/provider.json`
- `packages/lapp/conformance/profiles/invalid/reserved-provider-suffix/.lapp/providers/reserved/models.json`
- `packages/lapp/conformance/profiles/invalid/reserved-provider-suffix/.lapp/providers/reserved/provider.json`
- `packages/lapp/conformance/profiles/invalid/secret-references/.lapp/providers/empty-credential/provider.json`
- `packages/lapp/conformance/profiles/invalid/secret-references/.lapp/providers/empty-provider/provider.json`
- `packages/lapp/conformance/profiles/invalid/secret-references/.lapp/providers/encoded/provider.json`
- `packages/lapp/conformance/profiles/invalid/secret-references/.lapp/providers/extra-path/provider.json`
- `packages/lapp/conformance/profiles/invalid/secret-references/.lapp/providers/file/provider.json`
- `packages/lapp/conformance/profiles/invalid/secret-references/.lapp/providers/fragment/provider.json`
- `packages/lapp/conformance/profiles/invalid/secret-references/.lapp/providers/invalid-env/provider.json`
- `packages/lapp/conformance/profiles/invalid/secret-references/.lapp/providers/keychain/provider.json`
- `packages/lapp/conformance/profiles/invalid/secret-references/.lapp/providers/mismatch/models.json`
- `packages/lapp/conformance/profiles/invalid/secret-references/.lapp/providers/mismatch/provider.json`
- `packages/lapp/conformance/profiles/invalid/secret-references/.lapp/providers/port/provider.json`
- `packages/lapp/conformance/profiles/invalid/secret-references/.lapp/providers/query/provider.json`
- `packages/lapp/conformance/profiles/invalid/secret-references/.lapp/providers/unknown/provider.json`
- `packages/lapp/conformance/profiles/invalid/secret-references/.lapp/providers/userinfo/provider.json`
- `packages/lapp/conformance/profiles/invalid/source-priority-fractional/.lapp/providers/demo/models.json`
- `packages/lapp/conformance/profiles/invalid/source-priority-fractional/.lapp/providers/demo/provider.json`
- `packages/lapp/conformance/profiles/invalid/source-priority-negative/.lapp/providers/demo/models.json`
- `packages/lapp/conformance/profiles/invalid/source-priority-negative/.lapp/providers/demo/provider.json`
- `packages/lapp/conformance/profiles/invalid/trailing-dot-provider/.lapp/providers/foo/models.json`
- `packages/lapp/conformance/profiles/invalid/trailing-dot-provider/.lapp/providers/foo/provider.json`
- `packages/lapp/conformance/profiles/invalid/unsafe-provider/.lapp/providers/example/provider.json`
- `packages/lapp/conformance/profiles/invalid/unsupported-jsonc/.lapp/providers/deepseek/provider.jsonc`
- `packages/lapp/conformance/profiles/invalid/vault-portable-ids/.lapp/providers/credential-reserved/models.json`
- `packages/lapp/conformance/profiles/invalid/vault-portable-ids/.lapp/providers/credential-reserved/provider.json`
- `packages/lapp/conformance/profiles/invalid/vault-portable-ids/.lapp/providers/credential-trailing-dot/models.json`
- `packages/lapp/conformance/profiles/invalid/vault-portable-ids/.lapp/providers/credential-trailing-dot/provider.json`
- `packages/lapp/conformance/profiles/invalid/vault-portable-ids/.lapp/providers/provider-reserved/models.json`
- `packages/lapp/conformance/profiles/invalid/vault-portable-ids/.lapp/providers/provider-reserved/provider.json`
- `packages/lapp/conformance/profiles/invalid/vault-portable-ids/.lapp/providers/provider-trailing-dot/models.json`
- `packages/lapp/conformance/profiles/invalid/vault-portable-ids/.lapp/providers/provider-trailing-dot/provider.json`
- `packages/lapp/conformance/profiles/valid/auth-forms/.lapp/providers/bearer/models.json`
- `packages/lapp/conformance/profiles/valid/auth-forms/.lapp/providers/bearer/provider.json`
- `packages/lapp/conformance/profiles/valid/auth-forms/.lapp/providers/header/models.json`
- `packages/lapp/conformance/profiles/valid/auth-forms/.lapp/providers/header/provider.json`
- `packages/lapp/conformance/profiles/valid/auth-forms/.lapp/providers/none/models.json`
- `packages/lapp/conformance/profiles/valid/auth-forms/.lapp/providers/none/provider.json`
- `packages/lapp/conformance/profiles/valid/auth-forms/.lapp/providers/plaintext/models.json`
- `packages/lapp/conformance/profiles/valid/auth-forms/.lapp/providers/plaintext/provider.json`
- `packages/lapp/conformance/profiles/valid/auth-forms/.lapp/providers/query/models.json`
- `packages/lapp/conformance/profiles/valid/auth-forms/.lapp/providers/query/provider.json`
- `packages/lapp/conformance/profiles/valid/auth-forms/.lapp/providers/vault/models.json`
- `packages/lapp/conformance/profiles/valid/auth-forms/.lapp/providers/vault/provider.json`
- `packages/lapp/conformance/profiles/valid/auth-only/.lapp/auth/codex-personal/models.json`
- `packages/lapp/conformance/profiles/valid/auth-only/.lapp/global.json`
- `packages/lapp/conformance/profiles/valid/auth-safe-extensions/.lapp/auth/subscription/models.json`
- `packages/lapp/conformance/profiles/valid/auth-safe-extensions/.lapp/global.json`
- `packages/lapp/conformance/profiles/valid/canonical-origin/.lapp/providers/demo/models.json`
- `packages/lapp/conformance/profiles/valid/canonical-origin/.lapp/providers/demo/provider.json`
- `packages/lapp/conformance/profiles/valid/mixed-registry/.lapp/auth/primary/models.json`
- `packages/lapp/conformance/profiles/valid/mixed-registry/.lapp/global.json`
- `packages/lapp/conformance/profiles/valid/mixed-registry/.lapp/providers/primary/models.json`
- `packages/lapp/conformance/profiles/valid/mixed-registry/.lapp/providers/primary/provider.json`
- `packages/lapp/conformance/profiles/valid/provider-type/.lapp/providers/reference/models.json`
- `packages/lapp/conformance/profiles/valid/provider-type/.lapp/providers/reference/provider.json`
- `packages/lapp/conformance/profiles/valid/source-priority/.lapp/providers/preferred/models.json`
- `packages/lapp/conformance/profiles/valid/source-priority/.lapp/providers/preferred/provider.json`
- `packages/lapp/conformance/revision-auth/.lapp/auth/a/models.json`
- `packages/lapp/conformance/revision-auth/.lapp/global.json`
- `packages/lapp/conformance/revision-auth/.lapp/providers/z/models.json`
- `packages/lapp/conformance/revision-auth/.lapp/providers/z/provider.json`
- `packages/lapp/conformance/revision-basic/.lapp/global.json`
- `packages/lapp/conformance/revision-basic/.lapp/providers/a/models.json`
- `packages/lapp/conformance/revision-basic/.lapp/providers/a/provider.json`
- `packages/lapp/conformance/revision-basic/.lapp/providers/z/models.json`
- `packages/lapp/conformance/revision-basic/.lapp/providers/z/provider.json`
- `packages/lapp/conformance/revision-v1.json`
- `packages/lapp/conformance/revision-v2.json`
- `packages/lapp/conformance/sdk-v1/anthropic-messages.json`
- `packages/lapp/conformance/sdk-v1/openai-audio-speech.json`
- `packages/lapp/conformance/sdk-v1/openai-chat-completions.json`
- `packages/lapp/conformance/sdk-v1/openai-images.json`
- `packages/lapp/conformance/sdk-v1/openai-responses.json`
- `packages/lapp/conformance/transaction-failures-v1.json`
- `packages/lapp/conformance/writer-lock-v1.json`
- `packages/lapp/docs/api.md`
- `packages/lapp/package.json`
- `packages/lapp/schema/auth.schema.json`
- `packages/lapp/schema/global-1.1.schema.json`
- `packages/lapp/schema/global.schema.json`
- `packages/lapp/schema/models.schema.json`
- `packages/lapp/schema/provider.schema.json`
- `packages/lapp/schema/writer-lock.schema.json`
- `packages/lapp/spec.en.md`
- `packages/lapp/spec.zh-CN.md`
- `packages/lapp/src/auth/client.ts`
- `packages/lapp/src/auth/driver.ts`
- `packages/lapp/src/auth/drivers/openai-codex.ts`
- `packages/lapp/src/auth/drivers/shared.ts`
- `packages/lapp/src/auth/drivers/xai-grok.ts`
- `packages/lapp/src/auth/index.ts`
- `packages/lapp/src/auth/lock.ts`
- `packages/lapp/src/auth/store.ts`
- `packages/lapp/src/client/adapter.ts`
- `packages/lapp/src/client/anthropic-messages.ts`
- `packages/lapp/src/client/http.ts`
- `packages/lapp/src/client/index.ts`
- `packages/lapp/src/client/normalized/index.ts`
- `packages/lapp/src/client/normalized/map.ts`
- `packages/lapp/src/client/normalized/parse.ts`
- `packages/lapp/src/client/normalized/tool-choice.ts`
- `packages/lapp/src/client/normalized/types.ts`
- `packages/lapp/src/client/normalized/validate.ts`
- `packages/lapp/src/client/openai-chat.ts`
- `packages/lapp/src/client/openai-responses.ts`
- `packages/lapp/src/client/sse.ts`
- `packages/lapp/src/client/usage.ts`
- `packages/lapp/src/config/discovery.ts`
- `packages/lapp/src/connection.ts`
- `packages/lapp/src/index.ts`
- `packages/lapp/src/json/ijson.ts`
- `packages/lapp/src/manage/index.ts`
- `packages/lapp/src/manager/contract.ts`
- `packages/lapp/src/manager/host.ts`
- `packages/lapp/src/manager/previews.ts`
- `packages/lapp/src/manager/revision.ts`
- `packages/lapp/src/manager/transaction.ts`
- `packages/lapp/src/media/core.ts`
- `packages/lapp/src/media/index.ts`
- `packages/lapp/src/media/internal.ts`
- `packages/lapp/src/media/openai-audio-speech.ts`
- `packages/lapp/src/media/openai-images.ts`
- `packages/lapp/src/media/types.ts`
- `packages/lapp/src/plan.ts`
- `packages/lapp/src/profile-location.ts`
- `packages/lapp/src/redact.ts`
- `packages/lapp/src/secret/index.ts`
- `packages/lapp/src/secret/vault.ts`
- `packages/lapp/src/source-priority.ts`
- `packages/lapp/src/sync/index.ts`
- `packages/lapp/src/types.ts`
- `packages/lapp/src/validate/constants.ts`
- `packages/lapp/src/validate/index.ts`
- `packages/lapp/src/write/atomic.ts`
- `packages/lapp/src/writer/lock.ts`
- `packages/lapp/src/writer/stable-read.ts`
- `packages/lapp/test/atomic-rollback.test.ts`
- `packages/lapp/test/auth-client.test.ts`
- `packages/lapp/test/auth-store.test.ts`
- `packages/lapp/test/client-edge.test.ts`
- `packages/lapp/test/client.test.ts`
- `packages/lapp/test/core-v1.test.ts`
- `packages/lapp/test/electron-bridge-example.test.ts`
- `packages/lapp/test/ijson.test.ts`
- `packages/lapp/test/manager-contract.test.ts`
- `packages/lapp/test/manager-host-v2.test.ts`
- `packages/lapp/test/manager-host.test.ts`
- `packages/lapp/test/media-client.test.ts`
- `packages/lapp/test/media-conformance.test.ts`
- `packages/lapp/test/normalized-contract.test.ts`
- `packages/lapp/test/profile-conformance.test.ts`
- `packages/lapp/test/registry-auth.test.ts`
- `packages/lapp/test/revision-conformance.test.ts`
- `packages/lapp/test/sdk-conformance.test.ts`
- `packages/lapp/test/source-priority.test.ts`
- `packages/lapp/test/stream.test.ts`
- `packages/lapp/test/system-vault.test.ts`
- `packages/lapp/test/tools.test.ts`
- `packages/lapp/test/transaction.test.ts`
- `packages/lapp/test/vault.test.ts`
- `packages/lapp/tsconfig.json`
- `packages/lapp/tsup.config.ts`
- `pnpm-lock.yaml`
- `pnpm-workspace.yaml`
- `scripts/init-local-registry.mts`
- `scripts/lapp-paths.mts`
- `scripts/local-registry-common.mts`
- `scripts/pack-smoke.mts`
- `scripts/publish-if-missing.mjs`
- `scripts/publish-local.mts`
- `scripts/reset-local-registry.mts`
- `scripts/resolve-canonical-ref.mjs`
- `scripts/resolve-canonical-ref.test.mjs`
- `scripts/smoke-local-registry.mts`
- `scripts/sync-canonical-spec.mjs`
- `scripts/verify-protocols.mts`
- `scripts/verify-schema.mjs`
- `spec-lock.json`
- `tsconfig.base.json`
- `vitest.config.ts`

## Toolchain

- Node: v24.16.0
- pnpm: 10.29.2

## Build / test / pack commands

Run from the worktree root after applying the patch onto `6fbd6ead1dbd9781d29788c2ea386e63cb7d2828`, or from the extracted source archive:

```text
pnpm install --frozen-lockfile
pnpm lint
pnpm test
pnpm build
pnpm verify:docs
pnpm verify:spec
pnpm smoke:pack
pnpm --filter @openlapp/lapp pack --pack-destination .
```

The commands above were used to produce and verify `openlapp-lapp-0.1.3-copilot.0.tgz` in this worktree.

## SHA-512

| Artifact | SHA-512 |
| --- | --- |
| `openlapp-lapp-0.1.3-copilot.0.tgz` | `5789550C75CD5E3A4D3CB0C11C6EE66A06F69872AFCB5BA69CE64C0E29F54753BFDDDB79A1B92E3C630E81BBCF6C457A97D4B2FFABF936A4B29EEF6DC7AB461D` |
| `openlapp-lapp-0.1.3-copilot.0.patch` | `CB70D9D5AFF264A908875BEB3F7986F1A91B4DA433434E00120FF152AFC26DC3370FAD7263CA98C4098B8C6EBC62773F99611709CF02FCFC4EF1AC7651FB430D` |
| `openlapp-lapp-0.1.3-copilot.0-source.tar.gz` | `ACFCA0ACDC10DE92FA9840E37321BE82BA3B6EFCCA74F84926B024FAB72D236B1BA82507310DD76569DAA82787EBF6E0BBC060EB5A2D19DDFD28E062F45FA54E` |

## Verification performed

- Package tarball SHA-512 matches the supervisor-supplied digest.
- Patch lists each previously untracked file and introduces it with a new-file diff.
- Source archive is extractable with `tar -xzf`.
- Source archive contains every untracked SDK file listed above.
- Source archive contains no `auth.json`, `.env`, `node_modules`, `.git`, `dist`, or generated `*.tgz`.
