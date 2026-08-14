# BUILD_REPORT — lapp-for-copilot 0.1.0

## Outcome

Three Medium reviewer findings are fixed in this standalone repo.
Existing provider auth-shape edits can be completed atomically with a
required new secret. `pnpm package` rewrites this report's VSIX size
and SHA-512 to match the artifact; `pnpm verify:vsix` fails if they
diverge. UI smoke no longer reports a false pass: the runner executes
real GUI mocha cases against isolated VS Code Stable. No publication,
sibling-repo access, git mutation, or dependency install.

## This pass

1. **Existing-provider auth-shape replacement** — metadata-only
   `provider.set` still omits `auth`. Changing to none/env stays
   secretless. Changing to vault / plaintext bearer / header / query
   shows a required new-secret field and submits one `provider.set`
   with the secret. Vault writes set `overwrite: true` so an existing
   credential can be replaced. Unchanged shapes still rotate only via
   Vault `credential.set`.
2. **BUILD_REPORT VSIX contract** — `applyVsixReportFacts` updates the
   Size and SHA-512 lines after the yazl write. `verify:vsix` compares
   those lines to the packaged bytes.
3. **UI smoke no longer false-reports** — the suite runs real GUI
   mocha cases in isolated VS Code Stable instead of claiming a pass
   without exercising the manager and chat model picker.

Prior vendor allowlist and REVISE items (1)–(9) remain.

## Final supervised verification

The facts below were independently verified by the supervisor. This
report edit did not run the commands.

| Command | Result |
| --- | --- |
| `pnpm check` | Pass (lint, typecheck, **49** unit, **7** webview, **8** mock-wire) |
| `pnpm test:ui-smoke` | **PASSED** — isolated VS Code Stable **1.133.0**; **3** mocha cases all passed: command palette Open Manager; manager page title and navigation; chat model picker shows openlapp model. Temporary demo `LAPP_HOME`. |
| `pnpm package` | yazl ZIP written; BUILD_REPORT size/SHA-512 synchronized |
| `pnpm verify:vsix` | ZIP + EOCD + yauzl extract + isolated install/list + BUILD_REPORT match **PASSED** |
| `pnpm test:integration:1.128` | **PASSED** (`1.128.1`) |
| `pnpm test:integration:1.133` | **PASSED** (`1.133.0`) |

UI smoke executable (isolated Stable archive):
`C:\Users\27837\AppData\Local\Temp\lapp-for-copilot-ui-smoke\VSCode-win32-x64-archive\Code.exe`

## VSIX

- Path: `dist-vsix/lapp-for-copilot-0.1.0.vsix`
- Size: 2,124,209 bytes
- SHA-512: `36780a8c35b198f0d0e3cac44d8c2d8ada396a9ffc98d2cd4f132e2b38cd4eee7c03c542e7cd33fc0d2d33a610017ccca4d0bd248a36e02a3f1140abd43aa2c5`
- yauzl entries: 508
- Isolated VS Code 1.133.0 `bin/code.cmd --install-extension` /
  `--list-extensions --show-versions`: `openlapp.lapp-for-copilot@0.1.0`
- Packed runtime: `@openlapp/lapp@0.1.3-copilot.0` (no `conformance/`),
  `node_modules/@napi-rs/keyring-win32-x64-msvc/keyring.win32-x64-msvc.node`
- Packed vendor: `vendor/openlapp-lapp-0.1.3-copilot.0.tgz`,
  `vendor/PROVENANCE.md`
- Not packed: source maps, our `test/`, `.env`, dependency `test`/`spec`/
  `.github`/`conformance` trees, `vendor/openlapp-lapp-0.1.3-copilot.0.patch`,
  `vendor/openlapp-lapp-0.1.3-copilot.0-source.tar.gz`,
  `vendor/openlapp-lapp-0.1.3-copilot.0-provenance.md`

## Vendor artifact SHA-512 (unchanged)

| Artifact | Bytes | SHA-512 |
| --- | ---: | --- |
| `vendor/openlapp-lapp-0.1.3-copilot.0.tgz` | 669945 | `5789550C75CD5E3A4D3CB0C11C6EE66A06F69872AFCB5BA69CE64C0E29F54753BFDDDB79A1B92E3C630E81BBCF6C457A97D4B2FFABF936A4B29EEF6DC7AB461D` |
| `vendor/openlapp-lapp-0.1.3-copilot.0.patch` | 114997 | `CB70D9D5AFF264A908875BEB3F7986F1A91B4DA433434E00120FF152AFC26DC3370FAD7263CA98C4098B8C6EBC62773F99611709CF02FCFC4EF1AC7651FB430D` |
| `vendor/openlapp-lapp-0.1.3-copilot.0-source.tar.gz` | 320808 | `ACFCA0ACDC10DE92FA9840E37321BE82BA3B6EFCCA74F84926B024FAB72D236B1BA82507310DD76569DAA82787EBF6E0BBC060EB5A2D19DDFD28E062F45FA54E` |
| `vendor/openlapp-lapp-0.1.3-copilot.0-provenance.md` | 25443 | `BA23534F467D364D911B03FF980B1A68579778DB76851C63859FF424EA55DF628951127C55D830B62D482B30CB1B7C4F837FE5DCEEDF606E0CCD2AC1A10A7116` |

## Architecture (unchanged)

Host esbuild CJS (`dist/extension.cjs`) externalizes `vscode`,
`@openlapp/lapp`, `@napi-rs/keyring`. Manager is Vue 3 + Vite with nonce CSP.
Vendor id `openlapp`. `extensionKind: ["ui"]`.

## Still blocked (not claimed)

1. **Live provider tool+image** — unverified. No live provider session
   was exercised. No secrets invented. See `docs/MANUAL_ACCEPTANCE.md`.
2. **Agent Host preview** — unverified / blocked. Read-only; never
   auto-enabled.

## Publication / sibling confirmation

No `git commit`, `push`, `tag`, `publish`, or `vsce publish`. No sibling
OpenLAPP repository was read or written.
