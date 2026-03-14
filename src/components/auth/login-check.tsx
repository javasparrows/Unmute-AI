"use client";

import { useEffect, useRef } from "react";

/**
 * Invisible component that fires a login device check on mount.
 * Should be placed in authenticated pages (e.g., dashboard).
 * Runs once per page load and silently ignores errors.
 */
export function LoginCheck() {
  const checked = useRef(false);

  useEffect(() => {
    if (checked.current) return;
    checked.current = true;

    fetch("/api/auth/login-check", { method: "POST" }).catch(() => {
      // Silently ignore -- login check is best-effort
    });
  }, []);

  return null;
}
