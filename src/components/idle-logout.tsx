"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  IDLE_STORAGE_KEY,
  IDLE_TIMEOUT_MS,
  IDLE_TOUCH_THROTTLE_MS,
  isIdleExpired,
} from "@/lib/idle";

const PUBLIC_PATHS = new Set(["/login", "/logout"]);
const LEAVE_CONFIRM_MS = 2000;

function readPresence() {
  const raw = window.localStorage.getItem(IDLE_STORAGE_KEY);
  const value = raw ? Number(raw) : 0;
  return Number.isFinite(value) ? value : 0;
}

function writePresence(at = Date.now()) {
  window.localStorage.setItem(IDLE_STORAGE_KEY, String(at));
  return at;
}

function clearPresence() {
  window.localStorage.removeItem(IDLE_STORAGE_KEY);
}

function signOutNow() {
  clearPresence();
  if (window.location.pathname === "/logout" || window.location.pathname === "/login") {
    return;
  }
  window.location.replace("/logout");
}

function touchSession(keepalive = false) {
  return fetch("/api/auth/session", {
    credentials: "same-origin",
    keepalive,
    headers: { Accept: "application/json" },
  })
    .then(async (res) => {
      if (keepalive) return res;
      const data = (await res.json().catch(() => null)) as { user?: unknown } | null;
      if (!data?.user) signOutNow();
      return res;
    })
    .catch(() => undefined);
}

export function IdleLogout() {
  const pathname = usePathname();

  useEffect(() => {
    if (PUBLIC_PATHS.has(pathname)) {
      clearPresence();
      return;
    }

    let timer = 0;
    let leaveConfirmTimer = 0;
    let lastTouchAt = 0;
    let confirmedAway = false;

    const armTimer = () => {
      window.clearTimeout(timer);
      const last = readPresence() || writePresence();
      const remaining = IDLE_TIMEOUT_MS - (Date.now() - last);
      if (remaining <= 0) {
        signOutNow();
        return;
      }
      timer = window.setTimeout(signOutNow, remaining);
    };

    const refreshSession = (keepalive = false) => {
      const now = Date.now();
      if (!keepalive && now - lastTouchAt < IDLE_TOUCH_THROTTLE_MS) return;
      lastTouchAt = now;
      void touchSession(keepalive);
    };

    const markLeave = (keepalive = true) => {
      writePresence();
      refreshSession(keepalive);
    };

    const onReturn = () => {
      if (isIdleExpired(readPresence())) {
        signOutNow();
        return;
      }
      if (!confirmedAway) return;
      confirmedAway = false;
      writePresence();
      armTimer();
      refreshSession();
    };

    const onActivity = () => {
      if (isIdleExpired(readPresence())) {
        signOutNow();
        return;
      }
      confirmedAway = false;
      writePresence();
      armTimer();
      refreshSession();
    };

    const onLeave = () => {
      window.clearTimeout(leaveConfirmTimer);
      confirmedAway = true;
      markLeave(true);
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        window.clearTimeout(leaveConfirmTimer);
        leaveConfirmTimer = window.setTimeout(() => {
          confirmedAway = true;
          markLeave(true);
        }, LEAVE_CONFIRM_MS);
        return;
      }
      window.clearTimeout(leaveConfirmTimer);
      onReturn();
    };

    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        confirmedAway = true;
        onReturn();
      }
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key !== IDLE_STORAGE_KEY) return;
      if (event.newValue == null) {
        signOutNow();
        return;
      }
      armTimer();
    };

    if (isIdleExpired(readPresence())) {
      signOutNow();
      return;
    }

    writePresence();
    armTimer();
    refreshSession();

    const activityEvents: Array<keyof WindowEventMap> = [
      "pointerdown",
      "keydown",
      "touchstart",
      "wheel",
      "scroll",
    ];
    for (const event of activityEvents) {
      window.addEventListener(event, onActivity, { passive: true });
    }
    window.addEventListener("pagehide", onLeave);
    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("storage", onStorage);

    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(leaveConfirmTimer);
      for (const event of activityEvents) {
        window.removeEventListener(event, onActivity);
      }
      window.removeEventListener("pagehide", onLeave);
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("storage", onStorage);
    };
  }, [pathname]);

  return null;
}
