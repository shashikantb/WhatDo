import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "../trpc";

export const appointmentsRouter = createTRPCRouter({
  /** List appointments for the current user (as customer or business). */
  listMine: protectedProcedure
    .input(
      z.object({
        role: z.enum(["customer", "business"]).default("customer"),
        status: z.enum(["CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"]).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where =
        input.role === "business"
          ? { businessId: ctx.session.user.id }
          : { customerId: ctx.session.user.id };
      if (input.status) where.status = input.status;
      return ctx.prisma.appointment.findMany({
        where,
        orderBy: { startTime: "asc" },
        include: {
          service: true,
          resource: true,
          customer: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          business: { select: { id: true, username: true, displayName: true, avatarUrl: true, businessName: true } },
        },
      });
    }),

  /** List upcoming appointments for a business (public, for booking availability). */
  listForBusiness: publicProcedure
    .input(z.object({ businessId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.appointment.findMany({
        where: {
          businessId: input.businessId,
          status: "CONFIRMED",
          startTime: { gte: new Date() },
        },
        select: { id: true, startTime: true, endTime: true, resourceId: true },
        orderBy: { startTime: "asc" },
      });
    }),

  /** Book a new appointment with a business. */
  book: protectedProcedure
    .input(
      z.object({
        businessId: z.string().cuid(),
        serviceId: z.string().cuid(),
        resourceId: z.string().cuid().optional().nullable(),
        startTime: z.coerce.date(),
        notes: z.string().max(500).optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      if (input.businessId === userId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot book an appointment with yourself." });
      }

      const service = await ctx.prisma.businessService.findUnique({
        where: { id: input.serviceId },
      });
      if (!service || service.userId !== input.businessId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Service not found." });
      }
      if (!service.isActive) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This service is not available." });
      }

      const endTime = new Date(input.startTime.getTime() + service.durationMinutes * 60_000);

      // Check for overlapping confirmed appointments for the same business/resource.
      const overlapWhere: any = {
        businessId: input.businessId,
        status: "CONFIRMED",
        startTime: { lt: endTime },
        endTime: { gt: input.startTime },
      };
      if (input.resourceId) overlapWhere.resourceId = input.resourceId;
      const overlap = await ctx.prisma.appointment.findFirst({ where: overlapWhere });
      if (overlap) {
        throw new TRPCError({ code: "CONFLICT", message: "This time slot is already booked." });
      }

      const appointment = await ctx.prisma.appointment.create({
        data: {
          customerId: userId,
          businessId: input.businessId,
          serviceId: input.serviceId,
          resourceId: input.resourceId ?? null,
          startTime: input.startTime,
          endTime,
          notes: input.notes ?? null,
        },
        include: { service: true },
      });

      // Notify the business owner.
      await ctx.prisma.notification.create({
        data: {
          userId: input.businessId,
          type: "APPOINTMENT_BOOKED",
          actorId: userId,
          metadata: {
            appointmentId: appointment.id,
            serviceName: service.name,
            startTime: appointment.startTime.toISOString(),
          },
        },
      });

      return appointment;
    }),

  /** Cancel an appointment (by customer or business owner). */
  cancel: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const apt = await ctx.prisma.appointment.findUnique({ where: { id: input.id } });
      if (!apt) throw new TRPCError({ code: "NOT_FOUND", message: "Appointment not found." });
      if (apt.customerId !== ctx.session.user.id && apt.businessId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You cannot cancel this appointment." });
      }
      if (apt.status === "CANCELLED" || apt.status === "COMPLETED") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This appointment cannot be cancelled." });
      }
      return ctx.prisma.appointment.update({
        where: { id: input.id },
        data: { status: "CANCELLED" },
      });
    }),

  /** Mark an appointment as completed (business only). */
  complete: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const apt = await ctx.prisma.appointment.findUnique({ where: { id: input.id } });
      if (!apt) throw new TRPCError({ code: "NOT_FOUND", message: "Appointment not found." });
      if (apt.businessId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only the business can mark appointments complete." });
      }
      return ctx.prisma.appointment.update({
        where: { id: input.id },
        data: { status: "COMPLETED" },
      });
    }),
});
