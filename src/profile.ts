import {
  ProfileReadUnstableError,
  ProfileValidationError,
  inspectProfile,
  listModels,
  loadProfile,
  readProfileStable,
  resolveLappRoot,
  resolveLappStateHome,
  type Diagnostic,
  type LappProfile,
} from "@openlapp/lapp";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { buildCatalog, type Catalog } from "./eligibility.js";
import { diagnostic, type AppDiagnostic } from "./shared/diagnostics.js";
import { sanitizeText } from "./sanitize.js";

const EMPTY_VAULT_REVISION = "00000000-0000-0000-0000-000000000000";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export interface ProfileSnapshot {
  root: string;
  revision: string;
  profileRevision: string;
  vaultRevision: string;
  profile: LappProfile | undefined;
  initialized: boolean;
  catalog: Catalog;
  diagnostics: AppDiagnostic[];
}

export function managerVaultRevisionPath(root: string): string {
  const stateHome = resolveLappStateHome();
  const normalized = process.platform === "win32" ? path.resolve(root).toLowerCase() : path.resolve(root);
  const key = createHash("sha256").update(normalized, "utf8").digest("hex");
  return path.join(stateHome, "revisions", "manager-vault-v1", `${key}.revision`);
}

export function readVaultRevision(root: string): string {
  const target = managerVaultRevisionPath(root);
  try {
    const stat = fs.lstatSync(target);
    if (!stat.isFile()) return EMPTY_VAULT_REVISION;
    const raw = fs.readFileSync(target, "utf8");
    const revision = raw.endsWith("\n") ? raw.slice(0, -1) : raw;
    return UUID.test(revision) ? revision : EMPTY_VAULT_REVISION;
  } catch {
    return EMPTY_VAULT_REVISION;
  }
}

function toAppDiagnostics(items: readonly Diagnostic[]): AppDiagnostic[] {
  return items.map((item) => diagnostic(
    item.level,
    item.code ?? "LAPP",
    sanitizeText(item.message),
    item.location ? sanitizeText(item.location) : undefined,
  ));
}

export function hasManagedProfile(root: string): boolean {
  return fs.existsSync(path.join(root, "global.json")) || fs.existsSync(path.join(root, "providers"));
}

export function loadProfileSnapshot(explicitRoot?: string): ProfileSnapshot {
  const root = resolveLappRoot(explicitRoot);
  const vaultRevision = readVaultRevision(root);
  const diagnostics: AppDiagnostic[] = [];

  if (!hasManagedProfile(root)) {
    return {
      root,
      revision: `missing:${vaultRevision}`,
      profileRevision: "missing",
      vaultRevision,
      profile: undefined,
      initialized: false,
      catalog: { models: [], identities: { toPublic: new Map(), fromPublic: new Map(), diagnostics: [] }, diagnostics: [] },
      diagnostics: [diagnostic("INFO", "PROFILE_MISSING", "No LAPP profile is configured yet. Open the Manager to create one.")],
    };
  }

  try {
    const stable = readProfileStable({ path: root });
    const catalog = buildCatalog(stable.value);
    return {
      root,
      revision: `${stable.revision}:${vaultRevision}`,
      profileRevision: stable.revision,
      vaultRevision,
      profile: stable.value,
      initialized: true,
      catalog,
      diagnostics: [...diagnostics, ...catalog.diagnostics],
    };
  } catch (error) {
    if (error instanceof ProfileValidationError) {
      return {
        root,
        revision: `invalid:${vaultRevision}`,
        profileRevision: "invalid",
        vaultRevision,
        profile: undefined,
        initialized: true,
        catalog: { models: [], identities: { toPublic: new Map(), fromPublic: new Map(), diagnostics: [] }, diagnostics: [] },
        diagnostics: toAppDiagnostics(error.diagnostics),
      };
    }
    if (error instanceof ProfileReadUnstableError) {
      throw error;
    }
    try {
      const inspected = inspectProfile({ path: root });
      return {
        root,
        revision: `inspect:${vaultRevision}`,
        profileRevision: "inspect",
        vaultRevision,
        profile: undefined,
        initialized: true,
        catalog: { models: [], identities: { toPublic: new Map(), fromPublic: new Map(), diagnostics: [] }, diagnostics: [] },
        diagnostics: [
          diagnostic("ERROR", "PROFILE_READ_FAILED", sanitizeText(error instanceof Error ? error.message : String(error))),
          ...toAppDiagnostics(inspected.diagnostics),
        ],
      };
    } catch (inner) {
      return {
        root,
        revision: `error:${vaultRevision}`,
        profileRevision: "error",
        vaultRevision,
        profile: undefined,
        initialized: false,
        catalog: { models: [], identities: { toPublic: new Map(), fromPublic: new Map(), diagnostics: [] }, diagnostics: [] },
        diagnostics: [diagnostic("ERROR", "PROFILE_READ_FAILED", sanitizeText(inner instanceof Error ? inner.message : String(inner)))],
      };
    }
  }
}

export function loadProfileOrThrow(explicitRoot?: string): LappProfile {
  return loadProfile({ path: explicitRoot });
}

export function listAllModels(profile: LappProfile) {
  return listModels(profile, { includeDisabled: true });
}
