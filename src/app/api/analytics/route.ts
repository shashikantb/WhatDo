import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "../../../../auth";

const THROTTLE_WINDOW_MS = 5000;
const lastSent = new Map<string, number>();

const PayloadSchema = z.object({
  eventType: z.string().min(1).max(120),
  properties: z.record(z.unknown()).optional(),
  sessionId: z.string().max(200).optional(),
  pageUrl: z.string().max(2048).optional(),
  referrer: z.string().max(2048).optional(),
});

export async function POST(req: Request) {
  try {
    const raw = await req.json();
    const parsed = PayloadSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
    }
    const { eventType, properties, sessionId, pageUrl, referrer } = parsed.data;

    let userId: string | undefined;
    try {
      const session = await auth();
      userId = session?.user?.id;
    } catch {
      userId = undefined;
    }

    const now = Date.now();
    if (userId) {
      const key = `${userId}::${eventType}`;
      const last = lastSent.get(key) ?? 0;
      if (now - last < THROTTLE_WINDOW_MS) {
        return NextResponse.json({ ok: true, throttled: true });
      }
      lastSent.set(key, now);
      for (const [k, t] of lastSent.entries()) {
        if (now - t > THROTTLE_WINDOW_MS * 2) lastSent.delete(k);
      }
    }

    const ipHash =
      req.headers.get("x-forwarded-for")?.slice(0, 100) ??
      req.headers.get("x-real-ip")?.slice(0, 100) ??
      undefined;
    const userAgent = req.headers.get("user-agent")?.slice(0, 500);

    try {
      await prisma.analyticsEvent.create({
        data: {
          userId,
          sessionId,
          eventType,
          properties: (properties ?? {}) as any,
          pageUrl,
          referrer,
          userAgent,
          ipHash,
        },
      });
    } catch {
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "server" }, { status: 500 });
  }
}
