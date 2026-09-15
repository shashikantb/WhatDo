import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import prisma from "../db";
import { rateLimit } from "../utils/rate-limit";

export type TRPCContext = {
  prisma: typeof prisma;
  session: {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: string;
    };
  } | null;
  req?: NextRequest;
  userIp?: string;
  headers: Headers;
};

export async function createTRPCContext(opts: {
  headers: Headers;
  req?: NextRequest;
}): Promise<TRPCContext> {
  const session = await auth().catch(() => null);

  let userIp: string | undefined;
  const fwd = opts.headers.get("x-forwarded-for");
  if (fwd) {
    userIp = fwd.split(",")[0]?.trim();
  } else {
    userIp = opts.headers.get("x-real-ip") ?? undefined;
  }

  return {
    prisma,
    session,
    req: opts.req,
    userIp,
    headers: opts.headers,
  };
}

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const mergeRouters = t.mergeRouters;

const analyticsMiddleware = t.middleware(async ({ ctx, next, path, type }) => {
  const result = await next({ ctx });
  if (result.ok && ctx.session?.user?.id) {
    try {
      await ctx.prisma.analyticsEvent.create({
        data: {
          userId: ctx.session.user.id,
          eventType: `trpc_${type}_${path}`,
          userAgent: ctx.headers.get("user-agent") ?? undefined,
          ipHash: ctx.userIp ?? undefined,
          pageUrl: ctx.req?.url,
        },
      });
    } catch {
    }
  }
  return result;
});

export const publicProcedure = t.procedure.use(analyticsMiddleware);

export const protectedProcedure = t.procedure
  .use(analyticsMiddleware)
  .use(async ({ ctx, next }) => {
    if (!ctx.session?.user?.id) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.session.user.id },
      select: {
        isSuspended: true,
        isBanned: true,
        suspensionExpiresAt: true,
      },
    });
    if (!user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    if (user.isBanned) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Account is banned.",
      });
    }
    if (
      user.isSuspended &&
      (!user.suspensionExpiresAt || user.suspensionExpiresAt > new Date())
    ) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Account is suspended.",
      });
    }
    return next({
      ctx: {
        ...ctx,
        session: {
          ...ctx.session,
          user: ctx.session.user,
        },
      },
    });
  });

export const moderatorProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const role = ctx.session.user.role;
  if (role !== "MODERATOR" && role !== "ADMIN") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Moderator access required." });
  }
  return next({ ctx });
});

export const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.session.user.role !== "ADMIN") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required." });
  }
  return next({ ctx });
});

export type RateLimitKey = "vote" | "createPost" | "createComment" | "follow" | "upload";

export function createRateLimitMiddleware(key: RateLimitKey) {
  return t.middleware(async ({ ctx, next }) => {
    const identifier =
      ctx.session?.user?.id ?? ctx.userIp ?? ctx.headers.get("user-agent") ?? "anon";
    const res = await rateLimit(key, identifier);
    if (!res.success) {
      const retryAfter = Math.max(1, Math.ceil((res.reset - Date.now()) / 1000));
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: `Rate limit exceeded. Try again in ${retryAfter}s.`,
      });
    }
    return next({ ctx });
  });
}

export const rateLimitVoteMiddleware = createRateLimitMiddleware("vote");
export const rateLimitPostMiddleware = createRateLimitMiddleware("createPost");
export const rateLimitCommentMiddleware = createRateLimitMiddleware("createComment");
export const rateLimitFollowMiddleware = createRateLimitMiddleware("follow");
export const rateLimitUploadMiddleware = createRateLimitMiddleware("upload");
