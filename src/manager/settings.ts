import type { ConfigurationTarget, ExtensionContext, WorkspaceConfiguration } from "vscode";
import { SETTINGS_BACKUP_KEY, UTILITY_SETTING_KEYS } from "../constants.js";
import type { UtilitySettingsPreview, UtilitySettingsView } from "../shared/protocol.js";

export type UtilityField = keyof UtilitySettingsView;

export const UTILITY_FIELDS: UtilityField[] = [
  "utilityModel",
  "utilitySmallModel",
  "byokUtilityModelDefault",
];

export class UtilitySettingsError extends Error {
  readonly code: "APPLY_FAILED" | "PARTIAL_ROLLBACK_FAILED";
  readonly applied: UtilityField[];
  readonly rolledBack: UtilityField[];
  readonly rollbackFailed: UtilityField[];

  constructor(
    code: "APPLY_FAILED" | "PARTIAL_ROLLBACK_FAILED",
    message: string,
    applied: UtilityField[],
    rolledBack: UtilityField[],
    rollbackFailed: UtilityField[],
  ) {
    super(message);
    this.name = "UtilitySettingsError";
    this.code = code;
    this.applied = applied;
    this.rolledBack = rolledBack;
    this.rollbackFailed = rollbackFailed;
  }
}

export interface UtilitySettingsStore {
  read(): UtilitySettingsView;
  write(field: UtilityField, value: string | undefined): Promise<void>;
  getBackup(): UtilitySettingsView | undefined;
  setBackup(value: UtilitySettingsView): Promise<void>;
}

export function readUtilitySettings(config: WorkspaceConfiguration | { inspect(key: string): { globalValue?: unknown } | undefined; get?(key: string): unknown }): UtilitySettingsView {
  return {
    utilityModel: asString(getValue(config, UTILITY_SETTING_KEYS.utilityModel)),
    utilitySmallModel: asString(getValue(config, UTILITY_SETTING_KEYS.utilitySmallModel)),
    byokUtilityModelDefault: asString(getValue(config, UTILITY_SETTING_KEYS.byokUtilityModelDefault)),
  };
}

export function previewUtilityWrite(
  current: UtilitySettingsView,
  next: UtilitySettingsView,
  backup: UtilitySettingsView | undefined,
): UtilitySettingsPreview {
  return {
    current,
    next,
    ...(backup ? { backup } : {}),
  };
}

export function vscodeUtilityStore(
  config: WorkspaceConfiguration,
  context: Pick<ExtensionContext, "globalState">,
  target: ConfigurationTarget,
): UtilitySettingsStore {
  return {
    read: () => readUtilitySettings(config),
    write: async (field, value) => {
      await config.update(UTILITY_SETTING_KEYS[field], value, target);
    },
    getBackup: () => context.globalState.get<UtilitySettingsView>(SETTINGS_BACKUP_KEY),
    setBackup: async (value) => {
      await context.globalState.update(SETTINGS_BACKUP_KEY, value);
    },
  };
}

export async function applyUtilityWrite(
  next: UtilitySettingsView,
  store: UtilitySettingsStore,
): Promise<UtilitySettingsView> {
  const before = store.read();
  if (!store.getBackup()) {
    await store.setBackup(before);
  }
  await writeAllCompensating(store, next, before, "apply");
  return store.read();
}

export async function restoreUtilityWrite(store: UtilitySettingsStore): Promise<UtilitySettingsView | undefined> {
  const backup = store.getBackup();
  if (!backup) return undefined;
  const before = store.read();
  await writeAllCompensating(store, backup, before, "restore");
  return store.read();
}

async function writeAllCompensating(
  store: UtilitySettingsStore,
  next: UtilitySettingsView,
  before: UtilitySettingsView,
  action: "apply" | "restore",
): Promise<void> {
  const applied: UtilityField[] = [];
  try {
    for (const field of UTILITY_FIELDS) {
      await store.write(field, next[field]);
      applied.push(field);
    }
  } catch (error) {
    const rolledBack: UtilityField[] = [];
    const rollbackFailed: UtilityField[] = [];
    for (const field of [...applied].reverse()) {
      try {
        await store.write(field, before[field]);
        rolledBack.push(field);
      } catch {
        rollbackFailed.push(field);
      }
    }
    if (rollbackFailed.length > 0) {
      throw new UtilitySettingsError(
        "PARTIAL_ROLLBACK_FAILED",
        `Utility ${action} failed and could not restore ${rollbackFailed.join(", ")}.`,
        applied,
        rolledBack,
        rollbackFailed,
      );
    }
    throw new UtilitySettingsError(
      "APPLY_FAILED",
      `Utility ${action} failed; previous values were restored. ${error instanceof Error ? error.message : String(error)}`,
      applied,
      rolledBack,
      [],
    );
  }
}

function getValue(config: { inspect?(key: string): { globalValue?: unknown } | undefined; get?(key: string): unknown }, key: string): unknown {
  if (typeof config.inspect === "function") {
    const inspected = config.inspect(key);
    if (inspected && "globalValue" in inspected && inspected.globalValue !== undefined) {
      return inspected.globalValue;
    }
  }
  if (typeof config.get === "function") {
    return config.get(key);
  }
  return undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}
