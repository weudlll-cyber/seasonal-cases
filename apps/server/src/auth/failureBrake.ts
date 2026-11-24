/**
 * @file   apps/server/src/auth/failureBrake.ts
 * @brief  Sign-in's brake against guessing: the kit's `FailureBrake` under three keys; a success
 *         is not counted (DECISIONS D51, D55).
 *
 * Responsibility: `SignInBrake`, each over 15 minutes: 20 failures brake one account at one
 *                 address only; 100 failures brake the account at every address; 20 failures
 *                 brake the address for every account. The route asks `addressBraked` and
 *                 `accountBraked` before the password check and calls `failed` on a wrong
 *                 password. Keys are an account and an address range (./../addressKey.ts), never
 *                 a raw login. The counting itself is the kit's `FailureBrake` (v0.15.0, which
 *                 grew out of this file's own class: BACKLOG 49): a sliding window per key, a map
 *                 of at most 100 000 keys; with a full map the kit refuses a new key and keeps
 *                 every held key's count (this repository's own class evicted the oldest key).
 * Depends on:     @seasonal/kit/server; the clock is passed in.
 */
import { FailureBrake } from '@seasonal/kit/server';

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
