import assert from "node:assert/strict";
import * as vscode from "vscode";

export async function run() {
  const ext = vscode.extensions.getExtension("openlapp.lapp-for-copilot");
  assert.ok(ext, "extension is present");
  await ext.activate();
  assert.equal(ext.isActive, true);

  const commands = await vscode.commands.getCommands(true);
  assert.ok(commands.includes("openlapp.openManager"));
  assert.ok(commands.includes("openlapp.refreshModels"));

  await vscode.commands.executeCommand("openlapp.openManager");
  await vscode.commands.executeCommand("openlapp.refreshModels");

  const models = vscode.lm?.selectChatModels
    ? await vscode.lm.selectChatModels({ vendor: "openlapp" })
    : [];
  assert.ok(Array.isArray(models), "model list is an array");

  if (models.length === 0 || !models[0]?.sendRequest) {
    return;
  }

  const parts = [];
  const response = await models[0].sendRequest(
    [vscode.LanguageModelChatMessage.User("ping")],
    {},
    new vscode.CancellationTokenSource().token,
  );
  for await (const part of response.stream) {
    parts.push(part);
  }
  assert.ok(Array.isArray(parts));
}
