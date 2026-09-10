import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { type NextRequest } from "next/server";
import { appRouter } from "@/lib/trpc/routers/_app";
import { createTRPCContext } from "@/lib/trpc/trpc";

const handler = (req: NextRequest) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createTRPCContext({ headers: req.headers, req }),
    onError({ path, error, type, ctx }) {
      console.error(
        `tRPC error on ${type} ${path ?? "unknown"}: ${error.message}`,
        error.cause ?? error,
      );
      if (typeof window === "undefined") {
        try {
          // Sentry capture placeholder — integrate via @sentry/nextjs if installed
          // Sentry.captureException(error.cause ?? error);
        } catch {
        }
      }
    },
  });

export { handler as GET, handler as POST };
