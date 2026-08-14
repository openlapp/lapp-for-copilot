# Manual acceptance — OpenLAPP for Copilot

Use this script on a Windows x64 machine with VS Code Stable ≥ 1.128.1 and GitHub Copilot Chat installed. Do not paste secrets into issues or logs.

## Preconditions

1. Install the VSIX from `dist-vsix/lapp-for-copilot-0.1.0.vsix` (or the path printed by `pnpm package`).
2. Confirm the window is local Windows x64, not a remote extension host.
3. Have a real LAPP provider that supports text, tools, and image input. If none is configured, stop after the Manager checks and mark the live gate **BLOCKED**.

## Manager

1. Run `OpenLAPP: Open Manager`.
2. Confirm Overview shows platform, profile root (redacted), Vault state, and model counts.
3. Switch language via the VS Code display language (`en` / `zh-cn`) and reopen the Manager.
4. Create a provider, store a Vault credential, create a model, enable/disable, and delete with confirmation.
5. Run a provider-scoped connection test.
6. Run discovery preview. Confirm additions/name-fill, then Apply or Cancel. Confirm a stale revision is rejected.
7. Set `chat` and `subagent` defaults to valid provider/model pairs.
8. Preview Copilot utility settings, confirm, then Restore previous values.
9. Open Agent Host preview. Confirm the page does **not** enable `chat.agentHost.byokModels.enabled`.
10. Copy diagnostics. Confirm no secrets, home paths, raw responses, or image bytes.

## Copilot Chat

1. Open Copilot Chat.
2. Select `openlapp/<hashed-id>` for an eligible model.
3. Send a short text prompt. Expect a streamed or complete reply.
4. Switch to Agent mode and ask the model to use a workspace tool. Expect a tool call, then a result.
5. Attach a PNG/JPEG/WebP/GIF under 5 MiB (and keep the total under 20 MiB / 10 images). Expect the model to see the image only if `inputModalities` includes `image`.
6. Cancel a long request mid-flight. Expect a clean stop and no leftover credential logs.

## Blocked live gate

If no real provider is available:

```
BLOCKED: real provider tool+image gate
Setup: create a Windows user LAPP profile (default %USERPROFILE%\.lapp) with an enabled
provider, a Vault credential, and a model that declares protocols plus capabilities
["chat","stream","tool-call"] and inputModalities including image. Then rerun this script.
```
