"use client";

import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "./routers/_app";

export const trpc = createTRPCReact<AppRouter>();

export function getTrpcClientLinks() {
  return [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      async headers() {
        return {};
      },
    }),
  ];
}
