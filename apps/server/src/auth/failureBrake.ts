/**
 * @file   apps/server/src/auth/failureBrake.ts
 * @brief  The brake against guessing: failed sign-ins per key in a sliding window, and sign-in's
 *         three keys over it; a success is not counted (DECISIONS D51, D55).
 *
 * Responsibility: `FailureBrake`: `braked(key)` looks without counting, so the route can refuse
 *                 before the password check; `failed(key)` counts one failure once the password
 *                 was wrong. A key holds at most `limit` failure times, each forgotten `windowMs`
 *                 after it happened, so the (limit + 1)th try within the window is refused before
 *                 its password is checked and the brake lifts as the oldest failure ages out.
 *                 Nothing resets on a success. The map holds at most `maxKeys`, pruned of keys
 *                 with no failure in the window, then the oldest key goes.
 *                 `SignInBrake` (D55), each 15 minutes: 20 failures brake one account at one
 *                 address only; 100 failures brake the account at every address; 20 failures brake
 *                 the address for every account. Keys are an account and an address range
 *                 (./../addressKey.ts), never a raw login.
 *                 Built here because the kit's RateLimiter only takes and never looks first
 *                 (BACKLOG 49).
 * Depends on:     nothing; the clock is passed in.
 */

export interface FailureRule {
  readonly limit: number;
  readonly windowMs: number;
}

export class FailureBrake {
  private readonly failures = new Map<string, number[]>();

  constructor(
    private readonly rule: FailureRule,
    private readonly now: () => number = Date.now,
    private readonly maxKeys = 100_000,
  ) {}

  /** The key's failures still inside the window, oldest first (and forgets the rest). */
  private recent(key: string, at: number): number[] {
    const times = (this.failures.get(key) ?? []).filter((t) => at - t < this.rule.windowMs);
    if (times.length === 0) this.failures.delete(key);
    else this.failures.set(key, times);
    return times;
  }

  /** True while the key has `limit` failures inside the window: refuse before checking. */
  braked(key: string): boolean {
    return this.recent(key, this.now()).length >= this.rule.limit;
  }

  /** Counts one failed sign-in for the key. */
  failed(key: string): void {
    const at = this.now();
    const times = this.recent(key, at);
    if (!this.failures.has(key)) this.makeRoom(at);
    // Only the newest `limit` matter for the brake; older ones are dropped.
    this.failures.set(key, [...times, at].slice(-this.rule.limit));
  }

  // How many keys are held (tests watch the cap).
  get size(): number {
    return this.failures.size;
  }

  private makeRoom(at: number): void {
    if (this.failures.size < this.maxKeys) return;
    for (const key of [...this.failures.keys()]) this.recent(key, at);
    const oldest = this.failures.keys().next();
    if (this.failures.size >= this.maxKeys && oldest.done !== true) {
      this.failures.delete(oldest.value);
    }
  }
}

const WINDOW_MS = 15 * 60_000;

/** Sign-in's brake (D55): failures per account-and-address pair, per account, per address. */
export const SIGN_IN_BRAKE = { pair: 20, account: 100, address: 20, windowMs: WINDOW_MS } as const;

export class SignInBrake {
  private readonly pairs: FailureBrake;
  private readonly accounts: FailureBrake;
  private readonly addresses: FailureBrake;

  constructor(now: () => number = Date.now) {
    const { windowMs } = SIGN_IN_BRAKE;
    this.pairs = new FailureBrake({ limit: SIGN_IN_BRAKE.pair, windowMs }, now);
    this.accounts = new FailureBrake({ limit: SIGN_IN_BRAKE.account, windowMs }, now);
    this.addresses = new FailureBrake({ limit: SIGN_IN_BRAKE.address, windowMs }, now);
  }

  /** The address across all accounts: asked first, before the body is read. */
  addressBraked(address: string): boolean {
    return this.addresses.braked(address);
  }

  /** The account at this address, or the account everywhere. */
  accountBraked(account: string, address: string): boolean {
    return this.pairs.braked(`${account}|${address}`) || this.accounts.braked(account);
  }

  /** One wrong sign-in counts on all three keys. */
  failed(account: string, address: string): void {
    this.pairs.failed(`${account}|${address}`);
    this.accounts.failed(account);
    this.addresses.failed(address);
  }
}
