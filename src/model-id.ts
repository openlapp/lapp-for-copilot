import { createHash } from "node:crypto";
import { MODEL_ID_PREFIX, VENDOR_ID } from "./constants.js";
import { diagnostic, type AppDiagnostic } from "./shared/diagnostics.js";

export interface ModelIdentity {
  providerId: string;
  modelId: string;
}

export function publicModelId(identity: ModelIdentity): string {
  const digest = createHash("sha256")
    .update(identity.providerId, "utf8")
    .update("\0", "ascii")
    .update(identity.modelId, "utf8")
    .digest();
  return `${MODEL_ID_PREFIX}${digest.toString("base64url")}`;
}

export function modelSelector(publicId: string): string {
  return `${VENDOR_ID}/${publicId}`;
}

export interface IdentityMaps {
  toPublic: Map<string, string>;
  fromPublic: Map<string, ModelIdentity>;
  diagnostics: AppDiagnostic[];
}

export function buildIdentityMaps(
  identities: readonly ModelIdentity[],
  hash = publicModelId,
): IdentityMaps {
  const toPublic = new Map<string, string>();
  const fromPublic = new Map<string, ModelIdentity>();
  const diagnostics: AppDiagnostic[] = [];
  const seenHash = new Map<string, ModelIdentity>();

  for (const identity of identities) {
    const hashed = hash(identity);
    const key = `${identity.providerId}\0${identity.modelId}`;
    const previous = seenHash.get(hashed);
    if (previous && (previous.providerId !== identity.providerId || previous.modelId !== identity.modelId)) {
      diagnostics.push(diagnostic(
        "ERROR",
        "MODEL_ID_COLLISION",
        "Two local models produced the same public Copilot model id and were excluded.",
      ));
      fromPublic.delete(hashed);
      continue;
    }
    seenHash.set(hashed, identity);
    toPublic.set(key, hashed);
    fromPublic.set(hashed, identity);
  }

  return { toPublic, fromPublic, diagnostics };
}

export function lookupIdentity(maps: IdentityMaps, publicId: string): ModelIdentity | undefined {
  return maps.fromPublic.get(publicId);
}
