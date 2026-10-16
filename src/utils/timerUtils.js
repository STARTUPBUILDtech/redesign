/**
 * Synchronization utility for payment room invitation countdown timers.
 * Calculates remaining seconds (0 to 120) based on room's exact timestamp,
 * ensuring creator and invited counterparty are always in 100% synchronized lockstep,
 * even if the counterparty logs in late.
 */

export function computeInviteSecondsLeft(roomOrInvite) {
  if (!roomOrInvite) return 120;
  if (
    roomOrInvite.status === "expired" ||
    roomOrInvite.is_expired ||
    roomOrInvite.statusText === "Expired" ||
    roomOrInvite.status_text === "Expired"
  ) {
    return 0;
  }

  const now = Date.now();

  // 1. Explicit numeric expiration timestamp in milliseconds
  if (typeof roomOrInvite.expires_at_ms === "number" && roomOrInvite.expires_at_ms > 0) {
    const rem = Math.floor((roomOrInvite.expires_at_ms - now) / 1000);
    return Math.max(0, Math.min(120, rem));
  }

  // 2. ISO expires_at string
  if (roomOrInvite.expires_at) {
    try {
      const expTime = new Date(roomOrInvite.expires_at).getTime();
      if (!isNaN(expTime) && expTime > 0) {
        const rem = Math.floor((expTime - now) / 1000);
        return Math.max(0, Math.min(120, rem));
      }
    } catch (_) {}
  }

  // 3. Resent timestamp (in ms or ISO)
  const resent = roomOrInvite.resent_at;
  if (resent) {
    const resentTime = typeof resent === "number" ? resent : new Date(resent).getTime();
    if (!isNaN(resentTime) && resentTime > 0) {
      const elapsed = Math.floor((now - resentTime) / 1000);
      return Math.max(0, 120 - elapsed);
    }
  }

  // 4. Creation timestamp in ms
  if (typeof roomOrInvite.created_at_ms === "number" && roomOrInvite.created_at_ms > 0) {
    const elapsed = Math.floor((now - roomOrInvite.created_at_ms) / 1000);
    return Math.max(0, 120 - elapsed);
  }

  // 5. Updated_at or Created_at ISO timestamp
  const startStr = roomOrInvite.updated_at || roomOrInvite.created_at;
  if (startStr) {
    try {
      const startTime = new Date(startStr).getTime();
      if (!isNaN(startTime) && startTime > 0) {
        const elapsed = Math.floor((now - startTime) / 1000);
        return Math.max(0, 120 - elapsed);
      }
    } catch (_) {}
  }

  // 6. Direct numeric seconds if available
  if (typeof roomOrInvite.secondsLeft === "number") {
    return Math.max(0, Math.min(120, roomOrInvite.secondsLeft));
  }
  if (typeof roomOrInvite.seconds_left === "number") {
    return Math.max(0, Math.min(120, roomOrInvite.seconds_left));
  }

  return 120;
}
