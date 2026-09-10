import { z } from "zod";
import {
  createTRPCRouter,
  publicProcedure,
} from "../trpc";
import { USER_SELECT_PUBLIC } from "../../constants";
import { trackEvent } from "../../analytics";

const SearchType = z.enum(["all", "user", "post", "tag"]);

export const searchRouter = createTRPCRouter({
  query: publicProcedure
    .input(
      z.object({
        q: z.string().min(1).max(200),
        type: SearchType.default("all"),
        limit: z.number().int().min(1).max(100).default(30),
      }),
    )
    .query(async ({ ctx, input }) => {
      const q = input.q.trim();
      const results: {
        users?: unknown[];
        posts?: unknown[];
        tags?: unknown[];
      } = {};

      const searchType = input.type;

      if (searchType === "all" || searchType === "user") {
        results.users = await ctx.prisma.user.findMany({
          where: {
            OR: [
              { username: { contains: q, mode: "insensitive" } },
              { displayName: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          },
          take: Math.min(input.limit, 30),
          select: USER_SELECT_PUBLIC,
        });
      }

      if (searchType === "all" || searchType === "post") {
        results.posts = await ctx.prisma.post.findMany({
          where: {
            status: "PUBLISHED",
            OR: [
              { question: { search: q } },
              { question: { contains: q, mode: "insensitive" } },
            ],
          },
          take: Math.min(input.limit, 30),
          orderBy: { createdAt: "desc" },
          include: {
            creator: { select: USER_SELECT_PUBLIC },
            tags: { include: { tag: true } },
          },
        });
      }

      if (searchType === "all" || searchType === "tag") {
        results.tags = await ctx.prisma.tag.findMany({
          where: {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { slug: { contains: q, mode: "insensitive" } },
            ],
          },
          take: Math.min(input.limit, 30),
          orderBy: { postCount: "desc" },
        });
      }

      try {
        await trackEvent(
          "search",
          {
            userId: ctx.session?.user?.id,
            q,
            type: input.type,
            userCount: (results.users as unknown[] | undefined)?.length ?? 0,
            postCount: (results.posts as unknown[] | undefined)?.length ?? 0,
            tagCount: (results.tags as unknown[] | undefined)?.length ?? 0,
          },
          { skipThrottle: true },
        );
      } catch {
      }

      return results;
    }),

  suggestions: publicProcedure
    .input(z.object({ q: z.string().min(1).max(50) }))
    .query(async ({ ctx, input }) => {
      const q = input.q.trim();
      const users = await ctx.prisma.user.findMany({
        where: {
          OR: [
            { username: { startsWith: q, mode: "insensitive" } },
            { displayName: { startsWith: q, mode: "insensitive" } },
          ],
        },
        take: 8,
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      });
      return { users };
    }),
});
