# Vendored `@openlapp/lapp` provenance

| Field | Value |
| --- | --- |
| Package | `@openlapp/lapp` |
| Version | `0.1.3-copilot.0` |
| Artifact | `vendor/openlapp-lapp-0.1.3-copilot.0.tgz` |
| SHA-512 (hex) | `5789550C75CD5E3A4D3CB0C11C6EE66A06F69872AFCB5BA69CE64C0E29F54753BFDDDB79A1B92E3C630E81BBCF6C457A97D4B2FFABF936A4B29EEF6DC7AB461D` |
| Source base | `lapp-js@6fbd6ead1dbd9781d29788c2ea386e63cb7d2828` |

The SDK worktree that produced this tarball was **uncommitted** at packaging time. This extension does not treat that worktree as a source of truth. Runtime resolution uses only this checked-in tarball and the lockfile; there is no `file:../` sibling link, loopback registry, or postinstall downloader.

## Audit artifacts (repository only; not packed in the VSIX)

These three files make that uncommitted prerelease reproducibly auditable from this repository alone: apply `openlapp-lapp-0.1.3-copilot.0.patch` on `6fbd6ead1dbd9781d29788c2ea386e63cb7d2828`, or inspect `openlapp-lapp-0.1.3-copilot.0-source.tar.gz`, using the inventory and rebuild notes in `openlapp-lapp-0.1.3-copilot.0-provenance.md`. They stay in `vendor/` for review. `pnpm package` / `pnpm verify:vsix` ship only the runtime tarball and this file.

| Artifact | Role | Bytes | SHA-512 (hex) |
| --- | --- | ---: | --- |
| `openlapp-lapp-0.1.3-copilot.0.patch` | Binary-safe `git diff` of every prerelease change from the source base | 114997 | `CB70D9D5AFF264A908875BEB3F7986F1A91B4DA433434E00120FF152AFC26DC3370FAD7263CA98C4098B8C6EBC62773F99611709CF02FCFC4EF1AC7651FB430D` |
| `openlapp-lapp-0.1.3-copilot.0-source.tar.gz` | Source snapshot of the SDK worktree used to produce the tarball | 320808 | `ACFCA0ACDC10DE92FA9840E37321BE82BA3B6EFCCA74F84926B024FAB72D236B1BA82507310DD76569DAA82787EBF6E0BBC060EB5A2D19DDFD28E062F45FA54E` |
| `openlapp-lapp-0.1.3-copilot.0-provenance.md` | Detailed inventory, rebuild commands, and digest table | 25443 | `BA23534F467D364D911B03FF980B1A68579778DB76851C63859FF424EA55DF628951127C55D830B62D482B30CB1B7C4F837FE5DCEEDF606E0CCD2AC1A10A7116` |
