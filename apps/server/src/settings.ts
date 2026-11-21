/**
 * @file   apps/server/src/settings.ts
 * @brief  The settings of this server: the catalogue's values, stored, and held for new shows.
 *
 * Responsibility: `SettingsStore` keeps one set of values (the database's `server_state` row
 *                 `settings`, ./db/state.ts, or memory). `CurrentSettings` loads them once on
 *                 start, checked against the catalogue (@sc/contracts): a value the catalogue no
 *                 longer accepts falls back to its default, a value it does not know yet takes the
 *                 default. The show service reads `now()` at every creation (DECISIONS D25: a
 *                 change applies to new shows only).
 * Depends on:     @sc/contracts
 */
import { DEFAULT_SETTINGS, SettingsSchema, type Settings } from '@sc/contracts';

export interface SettingsStore {
  read(): Promise<unknown>;
  write(settings: Settings): Promise<void>;
}

export function memorySettings(): SettingsStore {
  let stored: Settings | undefined;
  return {
    read: () => Promise.resolve(stored),
    write: (settings) => {
      stored = settings;
      return Promise.resolve();
    },
  };
}

/** Stored values over the defaults, checked; the defaults when the result does not pass. */
export function settingsFrom(stored: unknown): Settings {
  if (typeof stored !== 'object' || stored === null) return DEFAULT_SETTINGS;
  const merged = { ...DEFAULT_SETTINGS, ...(stored as Partial<Settings>) };
  const checked = SettingsSchema.safeParse(merged);
  return checked.success ? checked.data : DEFAULT_SETTINGS;
}

export class CurrentSettings {
  private constructor(
    private readonly store: SettingsStore,
    private value: Settings,
  ) {}

  static async load(store: SettingsStore): Promise<CurrentSettings> {
    return new CurrentSettings(store, settingsFrom(await store.read()));
  }

  readonly now = (): Settings => this.value;

  /** Stores and uses the values; the caller has checked them against the catalogue. */
  async replace(settings: Settings): Promise<void> {
    await this.store.write(settings);
    this.value = settings;
  }
}
