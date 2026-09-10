import { z } from "zod";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
} from "../trpc";
import { USER_SELECT_PUBLIC } from "../../constants";

export const authRouter = createTRPCRouter({
  me: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.session?.user?.id) return null;
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.session.user.id },
      select: USER_SELECT_PUBLIC,
    });
    return user;
  }),

  getUserPreferences: protectedProcedure.query(async ({ ctx }) => {
    const prefs = await ctx.prisma.userPreferences.findUnique({
      where: { userId: ctx.session.user.id },
    });
    if (prefs) return prefs;
    return ctx.prisma.userPreferences.create({
      data: { userId: ctx.session.user.id },
    });
  }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        displayName: z.string().max(50).optional(),
        bio: z.string().max(200).optional(),
        avatarUrl: z.string().url().optional(),
        username: z
          .string()
          .regex(/^[a-zA-Z0-9_]{3,20}$/)
          .optional(),
        theme: z.enum(["light", "dark", "system"]).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      if (input.username) {
        const existing = await ctx.prisma.user.findUnique({
          where: { username: input.username },
        });
        if (existing && existing.id !== userId) {
          throw new Error("Username already taken");
        }
      }

      const userUpdate: Record<string, unknown> = {};
      if (input.displayName !== undefined) userUpdate.displayName = input.displayName;
      if (input.bio !== undefined) userUpdate.bio = input.bio;
      if (input.avatarUrl !== undefined) userUpdate.avatarUrl = input.avatarUrl;
      if (input.username !== undefined) userUpdate.username = input.username;

      const user = await ctx.prisma.user.update({
        where: { id: userId },
        data: userUpdate,
        select: USER_SELECT_PUBLIC,
      });

      if (input.theme) {
        await ctx.prisma.userPreferences.upsert({
          where: { userId },
          create: { userId, theme: input.theme },
          update: { theme: input.theme },
        });
      }

      return user;
    }),

  updatePreferences: protectedProcedure
    .input(
      z.object({
        emailNotifications: z.boolean().optional(),
        pushNotifications: z.boolean().optional(),
        marketingEmails: z.boolean().optional(),
        nsfwAllowed: z.boolean().optional(),
        matureContentAllowed: z.boolean().optional(),
        autoPlayVideos: z.boolean().optional(),
        dataSaverMode: z.boolean().optional(),
        theme: z.enum(["light", "dark", "system"]).optional(),
        allowAnonymousPosts: z.boolean().optional(),
        allowSearchIndexing: z.boolean().optional(),
        notifyOnVotes: z.boolean().optional(),
        notifyOnComments: z.boolean().optional(),
        notifyOnFollowers: z.boolean().optional(),
        notifyOnPredictions: z.boolean().optional(),
        notifyOnTrending: z.boolean().optional(),
        notifyOnMarketingPush: z.boolean().optional(),
        emailOnVotes: z.boolean().optional(),
        emailOnComments: z.boolean().optional(),
        emailOnFollowers: z.boolean().optional(),
        emailOnPredictions: z.boolean().optional(),
        emailOnTrending: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const data: Record<string, unknown> = {};
      if (input.emailNotifications !== undefined) data.emailNotifications = input.emailNotifications;
      if (input.pushNotifications !== undefined) data.pushNotifications = input.pushNotifications;
      if (input.marketingEmails !== undefined) data.marketingEmails = input.marketingEmails;
      if (input.nsfwAllowed !== undefined) data.nsfwAllowed = input.nsfwAllowed;
      if (input.matureContentAllowed !== undefined) data.matureContentAllowed = input.matureContentAllowed;
      if (input.autoPlayVideos !== undefined) data.autoPlayVideos = input.autoPlayVideos;
      if (input.dataSaverMode !== undefined) data.dataSaverMode = input.dataSaverMode;
      if (input.theme !== undefined) data.theme = input.theme;

      const prefs = await ctx.prisma.userPreferences.upsert({
        where: { userId },
        create: { userId, ...data },
        update: data,
      });
      return prefs;
    }),

  deleteAccount: protectedProcedure
    .input(z.object({ confirmation: z.literal("DELETE") }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      await ctx.prisma.user.delete({ where: { id: userId } });
      return { success: true };
    }),
});
