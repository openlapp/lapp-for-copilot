import {
  EventEmitter,
  LanguageModelTextPart,
  LanguageModelToolCallPart,
  type CancellationToken,
  type Event,
  type LanguageModelChatInformation,
  type LanguageModelChatProvider,
  type LanguageModelChatRequestMessage,
  type Progress,
  type PrepareLanguageModelChatModelOptions,
  type ProvideLanguageModelChatResponseOptions,
} from "vscode";
import { VENDOR_ID } from "./constants.js";
import { runChatRequest, toUserError } from "./chat.js";
import type { EligibleModel } from "./eligibility.js";
import { catalogFingerprint, type FingerprintedModel } from "./shared/fingerprint.js";
import { estimateIncomingTokens, estimateTextTokens } from "./messages.js";
import { loadProfileSnapshot, type ProfileSnapshot } from "./profile.js";
import { sanitizeError } from "./sanitize.js";
import { fromVsCodeMessages, fromVsCodeToolMode, fromVsCodeTools } from "./vscode-messages.js";

export interface OpenLappProviderHost {
  current(): ProfileSnapshot;
  refresh(reason: string): Promise<ProfileSnapshot>;
  log(message: string): void;
}

export class OpenLappChatProvider implements LanguageModelChatProvider {
  private readonly _onDidChange = new EventEmitter<void>();
  readonly onDidChangeLanguageModelChatInformation: Event<void> = this._onDidChange.event;
  private lastFingerprint = "";

  constructor(private readonly host: OpenLappProviderHost) {}

  notifyChanged(snapshot: ProfileSnapshot): void {
    const next = catalogFingerprint(snapshot.catalog.models.map((model) => toInformation(model) as FingerprintedModel));
    if (next === this.lastFingerprint) return;
    this.lastFingerprint = next;
    this._onDidChange.fire();
  }

  async provideLanguageModelChatInformation(
    _options: PrepareLanguageModelChatModelOptions,
    token: CancellationToken,
  ): Promise<LanguageModelChatInformation[]> {
    if (token.isCancellationRequested) return [];
    const snapshot = await this.host.refresh("model-list");
    return snapshot.catalog.models.map((model) => toInformation(model));
  }

  async provideLanguageModelChatResponse(
    model: LanguageModelChatInformation,
    messages: readonly LanguageModelChatRequestMessage[],
    options: ProvideLanguageModelChatResponseOptions,
    progress: Progress<LanguageModelTextPart | LanguageModelToolCallPart>,
    token: CancellationToken,
  ): Promise<void> {
    const snapshot = await this.host.refresh("request-start");
    const eligible = snapshot.catalog.models.find((entry) => entry.publicId === model.id);
    if (!eligible || !snapshot.profile) {
      throw new Error("The selected OpenLAPP model is no longer available.");
    }
    if (token.isCancellationRequested) return;
    const controller = new AbortController();
    const subscription = token.onCancellationRequested(() => controller.abort());
    try {
      await runChatRequest({
        profile: snapshot.profile,
        model: eligible,
        messages: fromVsCodeMessages(messages),
        tools: fromVsCodeTools(options.tools),
        toolChoice: fromVsCodeToolMode(options.toolMode, options.tools, options.modelOptions),
        temperature: numberOption(options.modelOptions, "temperature"),
        maxTokens: numberOption(options.modelOptions, "maxTokens") ?? numberOption(options.modelOptions, "max_tokens"),
        signal: controller.signal,
        onProgress: (part) => {
          if (part.type === "text") progress.report(new LanguageModelTextPart(part.text));
          else progress.report(new LanguageModelToolCallPart(part.id, part.name, part.arguments));
        },
      });
    } catch (error) {
      this.host.log(sanitizeError(error));
      throw toUserError(error);
    } finally {
      subscription.dispose();
    }
  }

  async provideTokenCount(
    _model: LanguageModelChatInformation,
    text: string | LanguageModelChatRequestMessage,
    token: CancellationToken,
  ): Promise<number> {
    if (token.isCancellationRequested) return 0;
    if (typeof text === "string") return estimateTextTokens(text);
    return estimateIncomingTokens(fromVsCodeMessages([text]));
  }
}

function numberOption(options: { [name: string]: unknown } | undefined, key: string): number | undefined {
  const value = options?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function toInformation(model: EligibleModel): LanguageModelChatInformation {
  return {
    id: model.publicId,
    name: model.name,
    family: model.family,
    version: model.version,
    maxInputTokens: model.maxInputTokens,
    maxOutputTokens: model.maxOutputTokens,
    tooltip: model.tooltip,
    detail: model.detail,
    capabilities: {
      toolCalling: model.toolCalling,
      imageInput: model.imageInput,
      ...({
        vision: model.imageInput,
        agentMode: model.toolCalling,
      }),
    } as LanguageModelChatInformation["capabilities"],
  };
}

export function selectorFor(publicId: string): string {
  return `${VENDOR_ID}/${publicId}`;
}

export function emptySnapshotHint(): ProfileSnapshot {
  return loadProfileSnapshot();
}
