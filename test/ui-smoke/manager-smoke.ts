import {
  By,
  EditorView,
  InputBox,
  Key,
  VSBrowser,
  WebView,
} from "vscode-extension-tester";

const MANAGER_TAB = "OpenLAPP Manager";

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitUntil(fn: () => Promise<boolean>, timeout: number, message: string): Promise<void> {
  const start = Date.now();
  let last = "";
  while (Date.now() - start < timeout) {
    try {
      if (await fn()) return;
    } catch (error) {
      last = error instanceof Error ? error.message : String(error);
    }
    await sleep(250);
  }
  throw new Error(last ? `${message}: ${last}` : message);
}

async function dismissOverlays(): Promise<void> {
  const driver = VSBrowser.instance.driver;
  for (let i = 0; i < 3; i += 1) {
    await driver.actions().sendKeys(Key.ESCAPE).perform();
    await sleep(150);
  }
}

async function clickVisibleText(text: string): Promise<boolean> {
  const driver = VSBrowser.instance.driver;
  const elements = await driver.findElements(By.xpath(
    `//*[self::a or self::button or self::span or self::div][normalize-space()=${JSON.stringify(text)}]`,
  ));
  for (const element of elements) {
    try {
      if (await element.isDisplayed()) {
        await element.click();
        return true;
      }
    } catch {
      // next
    }
  }
  return false;
}

async function runPaletteCommand(title: string): Promise<void> {
  await dismissOverlays();
  const driver = VSBrowser.instance.driver;
  if (!(await clickVisibleText("Show All Commands"))) {
    await driver.actions().sendKeys(Key.F1).perform();
  }
  const box = await InputBox.create(10_000);
  await box.setText(`>${title}`);
  await sleep(400);
  const pick = await box.findQuickPick(title);
  if (pick) {
    await pick.select();
    return;
  }
  const labels = await Promise.all((await box.getQuickPicks()).map((item) => item.getLabel()));
  const match = labels.find((label) => label.includes(title) || title.includes(label));
  if (match) {
    await box.selectQuickPick(match);
    return;
  }
  throw new Error(`Command ${JSON.stringify(title)} not in palette. Visible: ${labels.join(" | ")}`);
}

async function managerTabOpen(): Promise<boolean> {
  const titles = await new EditorView().getOpenEditorTitles();
  if (titles.some((title) => title.includes(MANAGER_TAB))) return true;
  const driver = VSBrowser.instance.driver;
  const tabs = await driver.findElements(By.css(".tab .label-name, .monaco-icon-label-container"));
  for (const tab of tabs) {
    const text = await tab.getText();
    if (text.includes(MANAGER_TAB)) return true;
  }
  return false;
}

async function openManager(): Promise<void> {
  await runPaletteCommand("OpenLAPP: Open Manager");
  await waitUntil(managerTabOpen, 20_000, "Manager editor tab did not open");
  try {
    await new EditorView().openEditor(MANAGER_TAB);
  } catch {
    // tab title may live outside EditorView
  }
}

async function switchToManagerFrame(): Promise<WebView> {
  const view = new WebView();
  await waitUntil(async () => {
    await view.switchToFrame(8_000);
    const headings = await view.findWebElements(By.css("nav strong"));
    return headings.length > 0;
  }, 25_000, "Manager webview frame did not load");
  return view;
}

async function openChat(): Promise<void> {
  const driver = VSBrowser.instance.driver;
  if (await clickVisibleText("Open Chat")) {
    await sleep(800);
  } else {
    await runPaletteCommand("Chat: Open Chat").catch(async () => {
      await runPaletteCommand("workbench.action.chat.open");
    });
  }
  await waitUntil(async () => {
    const widgets = await driver.findElements(By.css(
      ".interactive-session, .chat-editor, [class*='chat-widget'], .monaco-workbench .chat",
    ));
    if (widgets.length > 0) return true;
    const models = await driver.findElements(By.xpath("//*[normalize-space()='Models']"));
    for (const model of models) {
      if (await model.isDisplayed()) return true;
    }
    return false;
  }, 15_000, "Chat UI did not open");
}

async function openModelPicker(): Promise<void> {
  await dismissOverlays();
  if (await clickVisibleText("Models")) {
    await sleep(500);
    if (await pickerIsOpen()) return;
  }
  const driver = VSBrowser.instance.driver;
  const locators = [
    By.css("a[aria-label*='model' i]"),
    By.css("button[aria-label*='model' i]"),
    By.css("[aria-label*='Pick Model' i], [aria-label*='Select Model' i], [aria-label*='Change Model' i]"),
    By.css(".action-label[aria-label*='model' i]"),
  ];
  for (const locator of locators) {
    const elements = await driver.findElements(locator);
    for (const element of elements) {
      try {
        if (await element.isDisplayed()) {
          await element.click();
          if (await pickerIsOpen()) return;
        }
      } catch {
        // next
      }
    }
  }
  throw new Error("Chat model picker did not open via the Models control");
}

async function visibleByText(text: string): Promise<boolean> {
  const elements = await VSBrowser.instance.driver.findElements(By.xpath(
    `//*[normalize-space()=${JSON.stringify(text)}]`,
  ));
  for (const element of elements) {
    try {
      if (await element.isDisplayed()) return true;
    } catch {
      // next
    }
  }
  return false;
}

async function pickerIsOpen(): Promise<boolean> {
  if (await visibleByText("Search models") || await visibleByText("Manage Models...")) return true;
  const widget = await VSBrowser.instance.driver.findElements(By.css(".quick-input-widget"));
  if (widget.length > 0) {
    try {
      return await widget[0]!.isDisplayed();
    } catch {
      return true;
    }
  }
  try {
    await InputBox.create(1_200);
    return true;
  } catch {
    return false;
  }
}

async function pickerText(): Promise<string> {
  const driver = VSBrowser.instance.driver;
  const parts: string[] = [];
  const search = await driver.findElements(By.css("input[placeholder*='Search models' i], input[aria-label*='Search models' i]"));
  if (search[0]) {
    try {
      await search[0].clear();
      await search[0].sendKeys("openlapp");
      await sleep(400);
    } catch {
      // keep whatever is already listed
    }
  }
  const rows = await driver.findElements(By.css(
    "[class*='model'] [class*='item'], [class*='dropdown'] [role='option'], .monaco-list-row, .quick-input-widget",
  ));
  for (const row of rows) {
    try {
      if (await row.isDisplayed()) parts.push(await row.getText());
    } catch {
      // next
    }
  }
  for (const label of ["Demo Chat", "OpenLAPP", "Manage Models...", "Search models"]) {
    if (await visibleByText(label)) parts.push(label);
  }
  return [...new Set(parts.filter(Boolean))].join("\n");
}

describe("OpenLAPP UI smoke", () => {
  it("opens Manager from the command palette", async () => {
    await openManager();
  });

  it("shows Manager title and navigation", async () => {
    await openManager();
    const view = await switchToManagerFrame();
    try {
      const title = await (await view.findWebElement(By.css("nav strong"))).getText();
      if (!title.includes("OpenLAPP Manager")) {
        throw new Error(`Manager title was ${JSON.stringify(title)}`);
      }
      const labels = await Promise.all(
        (await view.findWebElements(By.css("nav button"))).map((button) => button.getText()),
      );
      if (!labels.includes("Overview") || !labels.includes("Providers")) {
        throw new Error(`Manager navigation was ${JSON.stringify(labels)}`);
      }
    } finally {
      await view.switchBack();
    }
  });

  it("opens the chat model picker with an openlapp model", async () => {
    await runPaletteCommand("OpenLAPP: Refresh Models").catch(() => undefined);
    await openChat();
    await openModelPicker();
    const text = await pickerText();
    if (!/openlapp\//i.test(text) && !/openlapp/i.test(text) && !/Demo Chat/i.test(text)) {
      throw new Error(`Chat model picker did not show an openlapp model. Visible: ${text.slice(0, 800)}`);
    }
  });
});
