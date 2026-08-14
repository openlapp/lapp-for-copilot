import "vscode";

declare module "vscode" {
  interface LanguageModelChatInformation {
    readonly tooltip?: string;
    readonly detail?: string;
    readonly capabilities: {
      readonly vision?: boolean;
      readonly imageInput?: boolean;
      readonly toolCalling: boolean | number;
      readonly agentMode?: boolean;
    };
  }
}
