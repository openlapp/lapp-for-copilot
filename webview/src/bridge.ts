import type { HostToWebview, WebviewToHost } from "@shared/protocol";

const vscode = acquireVsCodeApi();

export function post(message: WebviewToHost): void {
  vscode.postMessage(message);
}

export function listen(handler: (message: HostToWebview) => void): () => void {
  const listener = (event: MessageEvent<HostToWebview>) => {
    if (!event.data || typeof event.data !== "object" || typeof event.data.type !== "string") return;
    handler(event.data);
  };
  window.addEventListener("message", listener);
  return () => window.removeEventListener("message", listener);
}
