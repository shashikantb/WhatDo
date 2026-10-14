"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { trpc } from "@/lib/trpc/client";
import { getCurrentPosition } from "@/lib/utils";

/**
 * Periodically tracks and persists the authenticated user's location
 * to the server so family members see a reasonably fresh location.
 *
 * - Runs an initial update shortly after mount.
 * - Refreshes every `intervalMs` (default 5 min) while the app is open.
 * - Also refreshes on `visibilitychange` (tab becomes visible again).
 * - Only runs when the user is authenticated.
 */
export function useLocationTracker(intervalMs = 5 * 60 * 1000) {
  const { status } = useSession();
  const isAuthed = status === "authenticated";
  const updateLocation = trpc.users.updateLocation.useMutation();
  const lastPersisted = useRef<string>("");

  const persist = async () => {
    if (!isAuthed) return;
    try {
      const { latitude, longitude } = await getCurrentPosition();
      const key = `${latitude.toFixed(5)},${longitude.toFixed(5)}`;
      if (lastPersisted.current === key) return;
      lastPersisted.current = key;
      updateLocation.mutate({ latitude, longitude });
    } catch {
      // Location denied or unavailable — silently skip this tick.
    }
  };

  useEffect(() => {
    if (!isAuthed) return;

    // Initial update shortly after mount.
    const initialTimer = setTimeout(persist, 2000);

    // Periodic refresh.
    const interval = setInterval(persist, intervalMs);

    // Refresh when the tab becomes visible again (user returning to app).
    const onVisibility = () => {
      if (document.visibilityState === "visible") persist();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthed, intervalMs]);
}
