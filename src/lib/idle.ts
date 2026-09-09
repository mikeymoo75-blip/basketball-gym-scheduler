/** Signed-in users are logged out after this much idle time or time away from the site. */
export const IDLE_TIMEOUT_SECONDS = 15 * 60;
export const IDLE_TIMEOUT_MS = IDLE_TIMEOUT_SECONDS * 1000;
export const IDLE_STORAGE_KEY = "mpb-last-presence";
export const IDLE_TOUCH_THROTTLE_MS = 60 * 1000;

export function isIdleExpired(lastPresenceMs: number, nowMs = Date.now()) {
  if (!lastPresenceMs) return false;
  return nowMs - lastPresenceMs >= IDLE_TIMEOUT_MS;
}
