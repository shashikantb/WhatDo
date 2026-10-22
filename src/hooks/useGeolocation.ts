"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { getCurrentPosition, isNativeApp } from "@/lib/native/bridge";

export interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  error: string | null;
  loading: boolean;
}

export interface UseGeolocationOptions {
  /** Prompt for location immediately on mount. Default false. */
  immediate?: boolean;
  /** Enable high accuracy (GPS). Default true. */
  enableHighAccuracy?: boolean;
  /** Timeout in ms. Default 10000. */
  timeout?: number;
  /** Maximum age of cached position in ms. Default 0. */
  maximumAge?: number;
  /** Persist the location to the server User record. Default true. */
  persistToServer?: boolean;
}

/**
 * Client-side geolocation hook. Requests browser location, exposes
 * lat/lng/error state, and (optionally) persists the location to the
 * WhatDo User record via tRPC `users.updateLocation`.
 */
export function useGeolocation(options: UseGeolocationOptions = {}) {
  const {
    immediate = false,
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 0,
    persistToServer = true,
  } = options;

  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    error: null,
    loading: false,
  });

  const updateLocation = trpc.users.updateLocation.useMutation();
  const lastPersisted = useRef<string>("");

  const persist = useCallback(
    (lat: number, lng: number) => {
      if (!persistToServer) return;
      const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
      if (lastPersisted.current === key) return;
      lastPersisted.current = key;
      updateLocation.mutate({ latitude: lat, longitude: lng });
    },
    [persistToServer, updateLocation],
  );

  const request = useCallback(() => {
    // Inside the Android app this goes through the native Geolocation plugin
    // (real runtime permission prompt, precise location); on the website it is
    // a straight passthrough to navigator.geolocation with identical options
    // and error messages.
    const supportsWeb =
      typeof navigator !== "undefined" && !!navigator.geolocation;
    if (!isNativeApp() && !supportsWeb) {
      setState((s) => ({
        ...s,
        error: "Geolocation is not supported by this browser.",
        loading: false,
      }));
      return;
    }
    setState((s) => ({ ...s, loading: true, error: null }));
    getCurrentPosition({ enableHighAccuracy, timeout, maximumAge })
      .then(({ latitude, longitude, accuracy }) => {
        setState({
          latitude,
          longitude,
          accuracy,
          error: null,
          loading: false,
        });
        persist(latitude, longitude);
      })
      .catch((err: unknown) => {
        const message =
          err instanceof Error && err.message
            ? err.message
            : "Could not determine your location.";
        setState((s) => ({ ...s, error: message, loading: false }));
      });
  }, [enableHighAccuracy, timeout, maximumAge, persist]);

  useEffect(() => {
    if (immediate) request();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [immediate]);

  return { ...state, request };
}
