/**
 * @file   apps/server/src/configRead.ts
 * @brief  Reading the environment with every problem collected, not only the first.
 *
 * Responsibility: `EnvReader` reads one variable at a time and checks its form (text, number in a
 *                 range, an http(s) origin, a postgres URL, 64 hex digits, a list). A missing
 *                 required value or a malformed one is noted with the variable's name and the mode
 *                 that needs it; `finish` throws one `ConfigError` naming all of them, so the
 *                 server refuses to start with one message (SC-N3 piece 2). ./config.ts says
 *                 which variable each mode needs; docs/CONFIG.md lists them all.
 * Depends on:     nothing
 */

export class ConfigError extends Error {
  constructor(readonly problems: readonly string[]) {
    super(`the server cannot start:\n${problems.map((p) => `  - ${p}`).join('\n')}`);
  }
}

export class EnvReader {
  private readonly problems: string[] = [];

  constructor(private readonly env: NodeJS.ProcessEnv) {}

  /** The text, or '' when unset; `requiredIn` names the mode that needs it. */
  text(name: string, requiredIn?: string): string {
    const value = (this.env[name] ?? '').trim();
    if (value === '' && requiredIn !== undefined) this.note(`${name} is required in ${requiredIn}`);
    return value;
  }

  /** A whole number within the range, the default when unset. */
  int(name: string, fallback: number, range: { min: number; max: number }): number {
    const raw = this.text(name);
    if (raw === '') return fallback;
    const value = Number(raw);
    if (!Number.isInteger(value) || value < range.min || value > range.max) {
      this.note(`${name} must be a whole number from ${String(range.min)} to ${String(range.max)}`);
      return fallback;
    }
    return value;
  }

  /** An http(s) origin (scheme, host, port), or '' when unset and not required. */
  origin(name: string, requiredIn?: string): string {
    const raw = this.text(name, requiredIn);
    if (raw === '') return '';
    try {
      const url = new URL(raw);
      if (url.protocol === 'http:' || url.protocol === 'https:') return url.origin;
    } catch {
      // Noted below.
    }
    this.note(`${name} must be an http(s) address, such as https://example.org`);
    return '';
  }

  /** A postgres:// URL, or '' when unset and not required. */
  postgres(name: string, requiredIn?: string): string {
    const raw = this.text(name, requiredIn);
    if (raw === '' || /^postgres(ql)?:\/\/\S+$/.test(raw)) return raw;
    this.note(`${name} must be a postgres:// address`);
    return '';
  }

  /** 64 hex digits (32 bytes), or '' when unset and not required. */
  hexKey(name: string, requiredIn?: string): string {
    const raw = this.text(name, requiredIn);
    if (raw === '' || /^[0-9a-f]{64}$/i.test(raw)) return raw;
    this.note(`${name} must be 64 hex digits (openssl rand -hex 32)`);
    return '';
  }

  /** A comma-separated list without empty entries. */
  list(name: string, requiredIn?: string): string[] {
    const items = this.text(name, requiredIn)
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s !== '');
    return items;
  }

  /** One of the allowed words, the default when unset. */
  choice<T extends string>(name: string, allowed: readonly T[], fallback: T): T {
    const raw = this.text(name);
    if (raw === '') return fallback;
    const found = allowed.find((a) => a === raw);
    if (found === undefined) this.note(`${name} must be one of ${allowed.join(', ')}`);
    return found ?? fallback;
  }

  note(problem: string): void {
    this.problems.push(problem);
  }

  /** Throws one error naming every problem, if there is any. */
  finish(): void {
    if (this.problems.length > 0) throw new ConfigError(this.problems);
  }
}
