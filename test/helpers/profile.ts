import { createProfile, upsertModel, upsertProvider, type LappProfile } from "@openlapp/lapp";
import os from "node:os";
import path from "node:path";

export function makeProfile(options?: {
  protocol?: string;
  capabilities?: string[];
  inputModalities?: string[];
  outputModalities?: string[];
  contextWindow?: number;
  maxOutputTokens?: number;
  enabled?: boolean;
  providerEnabled?: boolean;
  modelId?: string;
  providerId?: string;
}): LappProfile {
  const rootDir = path.join(os.tmpdir(), "lapp-for-copilot-test");
  let profile = createProfile({ rootDir });
  profile = upsertProvider(profile, {
    id: options?.providerId ?? "demo",
    name: "Demo",
    enabled: options?.providerEnabled ?? true,
    baseUrl: "https://api.example.test/v1",
    protocols: [options?.protocol ?? "openai-chat-completions"],
    auth: { type: "none" },
  });
  profile = upsertModel(profile, {
    providerId: options?.providerId ?? "demo",
    id: options?.modelId ?? "demo-chat",
    name: "Demo Chat",
    enabled: options?.enabled ?? true,
    protocols: [options?.protocol ?? "openai-chat-completions"],
    inputModalities: options?.inputModalities ?? ["text"],
    outputModalities: options?.outputModalities ?? ["text"],
    capabilities: options?.capabilities ?? ["chat", "stream", "tool-call"],
    contextWindow: options?.contextWindow,
    maxOutputTokens: options?.maxOutputTokens,
  });
  return profile;
}
