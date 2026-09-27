/**
 * An invite code opened before the player has a nickname (e.g. a fresh
 * install from an invite link). Onboarding picks it up afterwards.
 */
let pending: string | null = null;

export function setPendingInvite(code: string | null) {
  pending = code;
}

export function takePendingInvite(): string | null {
  const c = pending;
  pending = null;
  return c;
}
