"use client";

import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, loggerLink } from "@trpc/client";
import { TRPCClientError } from "@trpc/client";
import superjson from "superjson";
import { trpc } from "./client";
import type { AppRouter } from "./routers/_app";

const NON_RETRYABLE_CODES: ReadonlySet<string> = new Set([
  "UNAUTHORIZED",
  "FORBIDDEN",
  "BAD_REQUEST",
  "NOT_FOUND",
  "METHOD_NOT_SUPPORTED",
  "TIMEOUT",
  "CONFLICT",
  "PRECONDITION_FAILED",
  "PAYLOAD_TOO_LARGE",
  "UNPROCESSABLE_CONTENT",
  "TOO_MANY_REQUESTS",
  "CLIENT_CLOSED_REQUEST",
  "INTERNAL_SERVER_ERROR",
  "NOT_IMPLEMENTED",
  "BAD_GATEWAY",
  "SERVICE_UNAVAILABLE",
]);

function isHtmlResponseError(error: unknown): boolean {
  if (error instanceof TRPCClientError) {
    if (typeof error.message === "string" && error.message.includes('Unexpected token \'<\'')) return true;
    const cause = (error as any).cause as unknown;
    if (cause instanceof Error && typeof cause.message === "string" && cause.message.includes('Unexpected token \'<\'')) return true;
  }
  if (error instanceof SyntaxError && typeof error.message === "string" && error.message.includes('Unexpected token \'<\'')) return true;
  return false;
}

function isNonRetryableTRPCError(error: unknown): boolean {
  if (isHtmlResponseError(error)) return true;
  if (error instanceof TRPCClientError) {
    const maybeCode =
      (error as any).data?.code ??
      (error as any).code ??
      null;
    if (typeof maybeCode === "string" && NON_RETRYABLE_CODES.has(maybeCode)) return true;
    const shape = error.shape as unknown as { message?: string; code?: number } | null | undefined;
    if (shape && typeof shape.code === "number" && shape.code >= 400 && shape.code < 600) return true;
    if (typeof (error as any).httpStatus === "number" && (error as any).httpStatus >= 400 && (error as any).httpStatus < 600) return true;
  }
  return false;
}

export default function TRPCProvider({
  children,
  ssrBaseUrl,
}: {
  children: React.ReactNode;
  ssrBaseUrl?: string;
}) {
  const resolvedBaseUrl: string = React.useMemo(() => {
    if (typeof window !== "undefined") return "";
    if (ssrBaseUrl) return ssrBaseUrl;
    if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
    return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  }, [ssrBaseUrl]);

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 1000,
            refetchOnWindowFocus: false,
            refetchOnMount: true,
            refetchOnReconnect: false,
            retry: (failureCount, error) => {
              if (failureCount >= 1) return false;
              if (isNonRetryableTRPCError(error)) return false;
              return true;
            },
          },
          mutations: {
            retry: (failureCount, error) => {
              if (failureCount >= 1) return false;
              if (isNonRetryableTRPCError(error)) return false;
              return false;
            },
          },
        },
      }),
  );

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        loggerLink({
          enabled: (opts) =>
            (process.env.NODE_ENV === "development" &&
              typeof window !== "undefined") ||
            (opts.direction === "down" && opts.result instanceof Error),
          console: {
            ...console,
            error: (...args: unknown[]) => {
              const first = args[0];
              const looksLikeError =
                first instanceof Error ||
                (typeof first === "string" &&
                  first.toLowerCase().includes("error")) ||
                (args.length >= 2 &&
                  typeof args[1] === "string" &&
                  args[1].toLowerCase().includes("error"));
              if (looksLikeError) {
                console.error(...args);
              } else {
                console.info(...args);
              }
            },
            log: (...args: unknown[]) => console.info(...args),
          },
        }),
        httpBatchLink({
          url: `${resolvedBaseUrl}/api/trpc`,
          transformer: superjson,
          maxURLLength: 2083,
        }),
      ],
      transformer: superjson,
    }),
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
