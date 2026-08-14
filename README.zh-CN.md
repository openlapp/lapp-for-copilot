<p align="center">
  <img src="./media/lapis.jpg" alt="OpenLAPP for Copilot 吉祥物 Lapis" width="320" />
</p>

# OpenLAPP for Copilot

[English](./README.md) · 简体中文

Windows x64 上的 VS Code UI 扩展：把本机 LAPP 配置注册为 Copilot 语言模型供应商（`openlapp`）。

协议为 [MIT](./LICENSE)。

## 安装

从 [GitHub Releases](https://github.com/openlapp/lapp-for-copilot/releases) 下载 `lapp-for-copilot-*.vsix`，在 VS Code Stable **1.128.1** 或更高版本中安装。

从源码打包：

```bash
pnpm install
pnpm check
pnpm build
pnpm package
```

VSIX 输出在 `dist-vsix/`。

## 它做什么

- 通过内置的 `@openlapp/lapp` SDK 读取系统 LAPP 配置和系统凭据库（Vault）。
- 把符合条件的对话模型注册给 Copilot，公开 ID 为哈希：`openlapp/lapp-<sha256-base64url>`。
- 用命令 **OpenLAPP: Open Manager** 打开整页管理器：提供方、Vault 元数据、模型、默认项、Copilot 实用模型设置、诊断。

首次使用前会要求知情同意：未同意前不会监视或创建共享 LAPP 目录，也不会向 Copilot 注册模型。同一 Windows 账户下的其他 LAPP 兼容应用也可以使用该位置和同一套 Vault 凭据。这不是按应用隔离。之后可用命令 **OpenLAPP: Review Shared Profile Consent** 再次查看或撤回。

本扩展不上架为必须步骤、不使用 proposed API、不添加自定义 Chat 参与者，也不占用活动栏容器。

## 在 Copilot 里使用

1. 打开管理器，添加提供方，把密钥存进系统 Vault，并启用声明了能力的文本模型。
2. 在 Copilot Chat 中选择 `openlapp/<hashed-id>`。
3. Agent 模式、工具调用、流式输出和图片输入以模型在本地配置里声明的能力为准。

## 脚本

| 脚本 | 作用 |
| --- | --- |
| `pnpm lint` / `pnpm typecheck` | 静态检查 |
| `pnpm test:unit` | 资格、ID、token、映射、脱敏、监视 |
| `pnpm test:wire` | OpenAI Chat / Responses / Anthropic 模拟协议测试 |
| `pnpm test:webview` | 管理器流程与无障碍 |
| `pnpm test:integration` | `@vscode/test-electron` 宿主测试 |
| `pnpm test:ui-smoke` | `vscode-extension-tester` GUI 冒烟（启动/用例失败即非零退出） |
| `pnpm package` / `pnpm verify:vsix` | Windows x64 VSIX + 内容审计 |
| `pnpm push` / `pnpm push:all` | 推送 `HEAD`（以及 tag）到 `origin` |
| `pnpm release:tag` / `pnpm release:push` | 按版本打 annotated tag；可选同时推送提交和 tag |
| `pnpm release:publish` | 按需发布到 VS Code Marketplace（`gh workflow run`） |

发版流程见 [docs/RELEASING.md](docs/RELEASING.md)。

## 许可

[MIT](./LICENSE) © 2026 OpenLAPP
