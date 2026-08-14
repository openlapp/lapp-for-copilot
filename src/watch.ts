import { ProfileReadUnstableError } from "@openlapp/lapp";
import fs from "node:fs";
import path from "node:path";
import { WATCH_DEBOUNCE_MS } from "./constants.js";
import { loadProfileSnapshot, managerVaultRevisionPath, type ProfileSnapshot } from "./profile.js";

export interface WatcherOptions {
  root: string;
  debounceMs?: number;
  now?: () => number;
  onChange: (snapshot: ProfileSnapshot) => void;
  onDiagnostic?: (message: string) => void;
  watchImpl?: typeof fs.watch;
}

export class ProfileWatcher {
  private readonly debounceMs: number;
  private readonly now: () => number;
  private timer: NodeJS.Timeout | undefined;
  private closed = false;
  private lastRevision: string | undefined;
  private readonly watchers: fs.FSWatcher[] = [];

  constructor(private readonly options: WatcherOptions) {
    this.debounceMs = options.debounceMs ?? WATCH_DEBOUNCE_MS;
    this.now = options.now ?? (() => Date.now());
  }

  start(): void {
    const watch = this.options.watchImpl ?? fs.watch;
    const targets = [this.options.root, path.dirname(managerVaultRevisionPath(this.options.root))];
    for (const target of targets) {
      try {
        fs.mkdirSync(target, { recursive: true });
        this.watchers.push(watch(target, { recursive: true }, () => this.schedule()));
      } catch (error) {
        this.options.onDiagnostic?.(error instanceof Error ? error.message : String(error));
      }
    }
  }

  schedule(): void {
    if (this.closed) return;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      void this.refresh();
    }, this.debounceMs);
  }

  async refresh(): Promise<ProfileSnapshot | undefined> {
    if (this.closed) return undefined;
    const snapshot = this.readUntilStable();
    if (!snapshot) return undefined;
    if (snapshot.revision !== this.lastRevision) {
      this.lastRevision = snapshot.revision;
      this.options.onChange(snapshot);
    }
    return snapshot;
  }

  readUntilStable(attempts = 3): ProfileSnapshot | undefined {
    let lastError: unknown;
    for (let i = 0; i < attempts; i += 1) {
      try {
        return loadProfileSnapshot(this.options.root);
      } catch (error) {
        lastError = error;
        if (!(error instanceof ProfileReadUnstableError)) {
          this.options.onDiagnostic?.(error instanceof Error ? error.message : String(error));
          return undefined;
        }
      }
    }
    this.options.onDiagnostic?.(lastError instanceof Error ? lastError.message : "Profile read did not stabilize.");
    return undefined;
  }

  dispose(): void {
    this.closed = true;
    if (this.timer) clearTimeout(this.timer);
    for (const watcher of this.watchers) watcher.close();
  }
}

export function debounceLeadingTrailing(fn: () => void, wait: number, clock: { now(): number } = Date): {
  trigger: () => void;
  flush: () => void;
} {
  let timer: NodeJS.Timeout | undefined;
  let last = 0;
  const trigger = () => {
    const elapsed = clock.now() - last;
    if (timer) clearTimeout(timer);
    if (elapsed >= wait) {
      last = clock.now();
      fn();
      return;
    }
    timer = setTimeout(() => {
      last = clock.now();
      fn();
    }, wait);
  };
  return {
    trigger,
    flush: () => {
      if (timer) clearTimeout(timer);
      fn();
    },
  };
}
