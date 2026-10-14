import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
} from "../trpc";
import { USER_SELECT_PUBLIC } from "../../constants";

// Sort user IDs so (a,b) and (b,a) map to the same pair for the unique constraint.
function sortedPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export const familyRouter = createTRPCRouter({
  // Send a family request to another user.
  sendRequest: protectedProcedure
    .input(z.object({ targetUserId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const me = ctx.session.user.id;
      if (input.targetUserId === me) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot add yourself as family." });
      }
      const [u1, u2] = sortedPair(me, input.targetUserId);
      const existing = await ctx.prisma.familyRelationship.findUnique({
        where: { userId1_userId2: { userId1: u1, userId2: u2 } },
      });
      if (existing) {
        if (existing.status === "APPROVED") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "You are already family members." });
        }
        if (existing.status === "PENDING") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "A family request already exists." });
        }
        // REJECTED → allow re-request by updating to PENDING.
      }
      const rel = await ctx.prisma.familyRelationship.upsert({
        where: { userId1_userId2: { userId1: u1, userId2: u2 } },
        update: { status: "PENDING", requesterId: me },
        create: { userId1: u1, userId2: u2, requesterId: me, status: "PENDING" },
      });
      await ctx.prisma.notification.create({
        data: { recipientId: input.targetUserId, actorId: me, type: "FAMILY_REQUEST" },
      }).catch(() => {});
      return rel;
    }),

  cancelRequest: protectedProcedure
    .input(z.object({ targetUserId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const me = ctx.session.user.id;
      const [u1, u2] = sortedPair(me, input.targetUserId);
      const rel = await ctx.prisma.familyRelationship.findUnique({
        where: { userId1_userId2: { userId1: u1, userId2: u2 } },
      });
      if (!rel || rel.status !== "PENDING" || rel.requesterId !== me) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No pending request to cancel." });
      }
      await ctx.prisma.familyRelationship.delete({ where: { id: rel.id } });
      return { success: true };
    }),

  respondRequest: protectedProcedure
    .input(z.object({ otherUserId: z.string().cuid(), action: z.enum(["approve", "reject"]) }))
    .mutation(async ({ ctx, input }) => {
      const me = ctx.session.user.id;
      const [u1, u2] = sortedPair(me, input.otherUserId);
      const rel = await ctx.prisma.familyRelationship.findUnique({
        where: { userId1_userId2: { userId1: u1, userId2: u2 } },
      });
      if (!rel || rel.status !== "PENDING" || rel.requesterId === me) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No pending request from that user." });
      }
      if (input.action === "approve") {
        await ctx.prisma.familyRelationship.update({
          where: { id: rel.id },
          data: { status: "APPROVED" },
        });
        await ctx.prisma.notification.create({
          data: { recipientId: rel.requesterId, actorId: me, type: "FAMILY_REQUEST_ACCEPTED" },
        }).catch(() => {});
      } else {
        await ctx.prisma.familyRelationship.update({
          where: { id: rel.id },
          data: { status: "REJECTED" },
        });
      }
      return { success: true };
    }),

  getRelationshipStatus: protectedProcedure
    .input(z.object({ targetUserId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const me = ctx.session.user.id;
      const [u1, u2] = sortedPair(me, input.targetUserId);
      const rel = await ctx.prisma.familyRelationship.findUnique({
        where: { userId1_userId2: { userId1: u1, userId2: u2 } },
      });
      if (!rel) return "none" as const;
      if (rel.status === "APPROVED") return "approved" as const;
      if (rel.status === "PENDING") {
        return rel.requesterId === me ? ("pending_from_me" as const) : ("pending_from_them" as const);
      }
      return "none" as const;
    }),

  listMembers: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(100).default(50) }))
    .query(async ({ ctx, input }) => {
      const me = ctx.session.user.id;
      const rels = await ctx.prisma.familyRelationship.findMany({
        where: {
          status: "APPROVED",
          OR: [{ userId1: me }, { userId2: me }],
        },
        take: input.limit,
        include: {
          user1: { select: { ...USER_SELECT_PUBLIC, latitude: true, longitude: true } },
          user2: { select: { ...USER_SELECT_PUBLIC, latitude: true, longitude: true } },
        },
      });
      return rels.map((r) => {
        const isMe1 = r.userId1 === me;
        const member = isMe1 ? r.user2 : r.user1;
        const shareMeToThem = isMe1 ? r.shareLocation1to2 : r.shareLocation2to1;
        const shareThemToMe = isMe1 ? r.shareLocation2to1 : r.shareLocation1to2;
        return {
          relationshipId: r.id,
          member,
          shareMyLocationToThem: shareMeToThem,
          shareTheirLocationToMe: shareThemToMe,
          createdAt: r.createdAt,
        };
      });
    }),

  listPendingRequests: protectedProcedure
    .query(async ({ ctx }) => {
      const me = ctx.session.user.id;
      // Incoming: I'm the target (requesterId !== me).
      const incoming = await ctx.prisma.familyRelationship.findMany({
        where: {
          status: "PENDING",
          OR: [{ userId1: me }, { userId2: me }],
          NOT: { requesterId: me },
        },
        include: {
          requester: { select: USER_SELECT_PUBLIC },
        },
        orderBy: { createdAt: "desc" },
      });
      // Outgoing: I requested.
      const outgoing = await ctx.prisma.familyRelationship.findMany({
        where: {
          status: "PENDING",
          requesterId: me,
        },
        include: {
          user1: { select: USER_SELECT_PUBLIC },
          user2: { select: USER_SELECT_PUBLIC },
        },
        orderBy: { createdAt: "desc" },
      });
      const outgoingList = outgoing.map((r) => {
        const target = r.userId1 === me ? r.user2 : r.user1;
        return { relationshipId: r.id, target, createdAt: r.createdAt };
      });
      return {
        incoming: incoming.map((r) => ({
          relationshipId: r.id,
          requester: r.requester,
          createdAt: r.createdAt,
        })),
        outgoing: outgoingList,
      };
    }),

  // List family members who share their location with me (for the map).
  listFamilyLocations: protectedProcedure
    .query(async ({ ctx }) => {
      const me = ctx.session.user.id;
      const rels = await ctx.prisma.familyRelationship.findMany({
        where: {
          status: "APPROVED",
          OR: [{ userId1: me }, { userId2: me }],
        },
        include: {
          user1: { select: { id: true, username: true, displayName: true, avatarUrl: true, latitude: true, longitude: true } },
          user2: { select: { id: true, username: true, displayName: true, avatarUrl: true, latitude: true, longitude: true } },
        },
      });
      return rels
        .map((r) => {
          const isMe1 = r.userId1 === me;
          const shareThemToMe = isMe1 ? r.shareLocation2to1 : r.shareLocation1to2;
          if (!shareThemToMe) return null;
          const member = isMe1 ? r.user2 : r.user1;
          if (member.latitude == null || member.longitude == null) return null;
          return {
            userId: member.id,
            username: member.username,
            displayName: member.displayName,
            avatarUrl: member.avatarUrl,
            latitude: member.latitude,
            longitude: member.longitude,
          };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);
    }),

  toggleShareLocation: protectedProcedure
    .input(z.object({
      targetUserId: z.string().cuid(),
      direction: z.enum(["meToThem", "themToMe"]),
      enabled: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      const me = ctx.session.user.id;
      const [u1, u2] = sortedPair(me, input.targetUserId);
      const rel = await ctx.prisma.familyRelationship.findUnique({
        where: { userId1_userId2: { userId1: u1, userId2: u2 } },
      });
      if (!rel || rel.status !== "APPROVED") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Not family members." });
      }
      const isMe1 = rel.userId1 === me;
      // meToThem: I share my location with them.
      //   isMe1 → shareLocation1to2; !isMe1 → shareLocation2to1.
      // themToMe: They share their location with me (I can only control my own sharing,
      //   so themToMe only reads; but we allow the owner of that direction to toggle it).
      //   For safety, only allow toggling the direction where the caller is the source.
      let field: "shareLocation1to2" | "shareLocation2to1";
      if (input.direction === "meToThem") {
        field = isMe1 ? "shareLocation1to2" : "shareLocation2to1";
      } else {
        // themToMe: source is the other user. Only the other user can toggle this.
        // If the caller is NOT the source, reject.
        const sourceIsMe1 = isMe1; // source of them→me is them; if isMe1 then source is user2 (them)
        // Actually: them→me means source = other user. Caller can only toggle if caller == source.
        // So if direction is "themToMe", caller should be the other user, which is impossible.
        // We only allow the source to toggle their own sharing direction.
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You can only control your own location sharing (meToThem).",
        });
      }
      await ctx.prisma.familyRelationship.update({
        where: { id: rel.id },
        data: { [field]: input.enabled },
      });
      return { success: true };
    }),

  // SOS alert: notify approved family members with the user's current location.
  sos: protectedProcedure
    .input(z.object({ message: z.string().max(500).optional() }))
    .mutation(async ({ ctx, input }) => {
      const me = ctx.session.user.id;
      const user = await ctx.prisma.user.findUnique({
        where: { id: me },
        select: { id: true, latitude: true, longitude: true, displayName: true, username: true },
      });
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });

      const rels = await ctx.prisma.familyRelationship.findMany({
        where: {
          status: "APPROVED",
          OR: [{ userId1: me }, { userId2: me }],
        },
        select: { userId1: true, userId2: true },
      });
      const familyIds = rels.map((r) => (r.userId1 === me ? r.userId2 : r.userId1));
      if (familyIds.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No family members to alert." });
      }

      const alert = await ctx.prisma.sosAlert.create({
        data: {
          senderId: me,
          latitude: user.latitude,
          longitude: user.longitude,
          message: input.message,
          status: "ACTIVE",
          recipients: { create: familyIds.map((fid) => ({ recipientId: fid })) },
        },
      });

      // Create in-app SOS notifications for each family member.
      await Promise.all(
        familyIds.map((fid) =>
          ctx.prisma.notification
            .create({
              data: {
                recipientId: fid,
                actorId: me,
                type: "SOS",
                payload: {
                  alertId: alert.id,
                  latitude: user.latitude,
                  longitude: user.longitude,
                  message: input.message ?? null,
                  senderName: user.displayName || user.username || "A family member",
                },
              },
            })
            .catch(() => null),
        ),
      );

      return { alertId: alert.id, notified: familyIds.length };
    }),
});
