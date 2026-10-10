import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Apple from "next-auth/providers/apple";
import {
  encode as defaultJwtEncode,
  decode as defaultJwtDecode,
} from "@auth/core/jwt";
import prisma from "@/lib/db";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { cookies } from "next/headers";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const registerSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(20)
    .regex(/^[a-zA-Z0-9_]+$/),
  displayName: z.string().min(2).max(50),
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

const saltRounds = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, saltRounds);
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function validateUniqueUsername(
  username: string,
  excludeUserId?: string,
): Promise<boolean> {
  const existing = await prisma.user.findFirst({
    where: {
      username: { equals: username, mode: "insensitive" },
      ...(excludeUserId ? { NOT: { id: excludeUserId } } : {}),
    },
    select: { id: true },
  });
  return !existing;
}

export async function validateUniqueEmail(
  email: string,
  excludeUserId?: string,
): Promise<boolean> {
  const existing = await prisma.user.findFirst({
    where: {
      email: { equals: email.toLowerCase(), mode: "insensitive" },
      ...(excludeUserId ? { NOT: { id: excludeUserId } } : {}),
    },
    select: { id: true },
  });
  return !existing;
}

// ============================================================================
// FINAL-GATE TOKEN WHITELIST — applied BOTH in:
//   (1) jwt() callback (return only 6-key plain new object, no spreading)
//   (2) jwt.encode() override (absolute last step before jose encryption)
//
// This double gate is the ONLY defense against 494 that actually works when
// the root cause (OAuth tokens leaked into session via Adapter / linkAccount
// flows) happens upstream and skips the callback entirely for linked users.
// ============================================================================

function sanitizeTokenPayload(token: any): Record<string, unknown> {
  const raw = token && typeof token === "object" ? (token as Record<string, any>) : {};
  const out: Record<string, unknown> = {};
  // JWT bookkeeping (also re-added by jose encode, but forward if set)
  if (typeof raw.iat === "number") out.iat = raw.iat;
  if (typeof raw.exp === "number") out.exp = raw.exp;
  if (typeof raw.jti === "string") out.jti = raw.jti;
  // Identity — priority: explicit id -> sub
  const sub =
    (typeof raw.id === "string" && raw.id) ||
    (typeof raw.userId === "string" && raw.userId) ||
    (typeof raw.sub === "string" && raw.sub) ||
    null;
  if (sub) {
    out.sub = sub;
    out.id = sub;
  }
  // Role normalization — accept r/role/role_name. Always drop undefined strings.
  const rawRole =
    (typeof raw.r === "string" && raw.r) ||
    (typeof raw.role === "string" && raw.role) ||
    (typeof raw.role_name === "string" && raw.role_name) ||
    "USER";
  out.role = rawRole || "USER";
  // username (used by session() callback — tiny 3-20 chars, kept outside the
  // critical 6 but worth preserving so the session doesn't need a round-trip
  // on every page for the username header. 14 chars is 14 bytes. No risk.
  if (typeof raw.u === "string" && raw.u) out.u = raw.u;
  else if (typeof raw.username === "string" && raw.username) out.u = raw.username;
  // email — small, preserved as a convenience claim so session.user.email
  // works without an extra DB lookup. Typical cost: 25 bytes. Safe.
  if (typeof raw.e === "string" && raw.e) out.e = raw.e;
  else if (typeof raw.email === "string" && raw.email) out.e = raw.email;
  return out;
}

// ============================================================================
// NextAuth configuration. NOTE: NO ADAPTER — ever. PrismaAdapter + linked
// OAuth accounts on Credentials sign-in route through an OAuth code path that
// skips the jwt() callback and pastes the full Google Account row (AT/RT/ID
// tokens + scope = 35KB) into the session token. Removing the adapter is
// the root-cause mitigation. We preserve parity (User + Account upserts) via
// explicit events.signIn manual DB writes.
// ============================================================================

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60, updateAge: 24 * 60 * 60 },
  jwt: {
    // Absolute final encode-gate. Whatever comes in, strip it before jose.
    async encode(params: any) {
      try {
        const { token, ...rest } = params;
        return await defaultJwtEncode({ ...rest, token: sanitizeTokenPayload(token) });
      } catch {
        const { token, ...rest } = params;
        return await defaultJwtEncode({ ...rest, token: sanitizeTokenPayload(token) });
      }
    },
    async decode(params: any) {
      return await defaultJwtDecode(params);
    },
  },
  pages: { signIn: "/login", signOut: "/login", error: "/login" },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      // Dangerous linking removed: it triggers the exact Account-row-lookup
      // flow that dumps OAuth tokens. Instead our signIn() callback +
      // events.signIn handle account creation / linking explicitly.
    }),
    Apple({
      clientId: process.env.AUTH_APPLE_ID,
      clientSecret: process.env.AUTH_APPLE_SECRET,
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const validated = loginSchema.safeParse(credentials);
        if (!validated.success) return null;
        const { email, password } = validated.data;
        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
          include: { preferences: true },
        });
        if (!user || !user.passwordHash) return null;
        if (user.isBanned) throw new Error("AccountBanned");
        if (
          user.isSuspended &&
          (!user.suspensionExpiresAt || user.suspensionExpiresAt > new Date())
        )
          throw new Error("AccountSuspended");
        const valid = await verifyPassword(password, user.passwordHash);
        if (!valid) return null;
        await prisma.user.update({
          where: { id: user.id },
          data: { lastActiveAt: new Date() },
        });
        // Important: return a SHALLOW plain object. Do NOT spread user
        // relations or preferences here. The 8 fields below are all we want.
        return {
          id: user.id,
          email: user.email,
          username: user.username ?? undefined,
          displayName: user.displayName ?? undefined,
          role: user.role,
          image: user.avatarUrl ?? undefined,
          name: user.displayName ?? undefined,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account, isNewUser, trigger, session }) {
      // NEVER mutate `token` then return it. NEVER spread `token` into the
      // return object. Those two patterns are exactly how 35KB got merged
      // back into the token before we had the encode gate.
      if (trigger === "update" && session && typeof session === "object") {
        // Optional: let `unstable_update({role, username})` mutate session
        const s = session as any;
        if (typeof s.role === "string") token = { ...token, role: s.role };
        if (typeof s.username === "string") token = { ...token, u: s.username };
      }
      const base: Record<string, any> = {};
      if (typeof token.iat === "number") base.iat = token.iat;
      if (typeof token.exp === "number") base.exp = token.exp;
      if (typeof token.jti === "string") base.jti = token.jti;

      // id priority: explicit update -> fresh user from authorize() -> token
      const idRaw: string | null =
        (typeof (token as any).id === "string" && (token as any).id) ||
        (typeof (token as any).userId === "string" && (token as any).userId) ||
        (user && typeof (user as any).id === "string" && (user as any).id) ||
        (typeof token.sub === "string" ? token.sub : null);
      if (idRaw) {
        base.sub = idRaw;
        base.id = idRaw;
      }

      // role priority: authorize return -> token.r -> token.role -> USER
      const roleRaw =
        (user && typeof (user as any).role === "string" && (user as any).role) ||
        (typeof (token as any).r === "string" && (token as any).r) ||
        (typeof (token as any).role === "string" && (token as any).role) ||
        "USER";
      base.role = roleRaw || "USER";

      // username priority: authorize return -> token.u -> token.username
      const uRaw =
        (user && typeof (user as any).username === "string" && (user as any).username) ||
        (typeof (token as any).u === "string" && (token as any).u) ||
        (typeof (token as any).username === "string" && (token as any).username) ||
        null;
      if (uRaw) base.u = uRaw;

      // email priority: authorize return -> token.e -> token.email. Cost ~25B.
      const eRaw =
        (user && typeof (user as any).email === "string" && (user as any).email) ||
        (typeof (token as any).e === "string" && (token as any).e) ||
        (typeof (token as any).email === "string" && (token as any).email) ||
        null;
      if (eRaw) base.e = eRaw;

      // Even this clean object gets re-sanitized by jwt.encode(). The
      // double-gate ensures accidental field regressions never survive.
      // `account` / OAuth tokens are EXPLICITLY dropped here — they never
      // appear in `base` regardless of what's in the inbound args.
      void account;
      void isNewUser;
      return base;
    },

    async session({ session, token }) {
      if (session.user) {
        const userId =
          ((token.id as string) ?? (token.userId as string) ?? (token.sub as string) ?? "");
        session.user.id = userId;
        session.user.role =
          ((token.role as string) ?? (token.r as string) ?? "USER") || "USER";
        // Username kept in session for UI header / profile previews. Still
        // small. If missing, don't bother the DB — pages that need it fetch.
        if (typeof token.u === "string") {
          session.user.username = token.u;
        }
        // Email from token (set from authorize() via sanitize)
        if (typeof token.e === "string") {
          session.user.email = token.e;
        }
        // Enrich session with DB-fresh fields (bans, avatar displayName etc.)
        if (userId) {
          try {
            const fresh = await prisma.user.findUnique({
              where: { id: userId },
              select: {
                isBanned: true,
                isSuspended: true,
                suspensionExpiresAt: true,
                role: true,
                email: true,
                username: true,
                displayName: true,
                avatarUrl: true,
              },
            });
            if (fresh) {
              session.user.role = fresh.role as any;
              // Always prefer canonical email from DB
              if (fresh.email) session.user.email = fresh.email;
              if (fresh.username) session.user.username = fresh.username;
              if (fresh.displayName) session.user.displayName = fresh.displayName;
              // Only preserve URL-based avatars. Drop data: URIs — they can
              // be 30KB-4MB base64 blobs stored during legacy portrait
              // uploads, and they turn /api/auth/session JSON into a large
              // download on every SSR pass. Pages that need them re-fetch
              // from the user profile endpoint directly.
              if (
                fresh.avatarUrl &&
                typeof fresh.avatarUrl === "string" &&
                /^https?:\/\//i.test(fresh.avatarUrl)
              ) {
                session.user.image = fresh.avatarUrl;
              } else {
                session.user.image = undefined;
              }
              if (session.user.username && !session.user.displayName) {
                session.user.displayName = session.user.username;
              }
              if (!session.user.name && session.user.displayName) {
                session.user.name = session.user.displayName;
              }
            }
          } catch {
            // don't break session on transient DB errors
          }
        }
      }
      return session;
    },

    async signIn({ user, account, profile, email, credentials }) {
      // Bans apply first
      if (account?.provider !== "credentials" && user?.email) {
        const existing = await prisma.user.findUnique({
          where: { email: (user.email as string).toLowerCase() },
        });
        if (existing?.isBanned) return false;
        if (!existing) {
          // For first-time sign-ups via Google/Apple, reserve a unique
          // username + canonical displayName before the linkAccount flow.
          const emailLower = (user.email as string).toLowerCase();
          const baseName =
            ((profile as any)?.given_name as string) ??
            (user.name as string) ??
            emailLower.split("@")[0] ??
            "whatdo_user";
          const base = String(baseName).replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 18);
          let username = base;
          let i = 1;
          while (!(await validateUniqueUsername(username))) {
            username = `${base.slice(0, 18)}${i++}`;
          }
          try {
            await prisma.user.update({
              where: { email: emailLower },
              data: { username, displayName: (user.name as string) ?? username },
            });
          } catch {
            // user row might not exist yet — events.signIn below handles the
            // upsert with the same data.
          }
        }
      }
      return true;
    },
  },
  events: {
    async linkAccount({ user, account }) {
      // Mark verified on Google/Apple OAuth link — parity with Adapter flow.
      if ((account.provider === "google" || account.provider === "apple") && user?.id) {
        try {
          await prisma.user.update({
            where: { id: user.id as string },
            data: { isVerified: true },
          });
        } catch {
          // ignore
        }
      }
    },
    async signIn({ user }) {
      // Without PrismaAdapter we don't auto-upsert the OAuth-sourced User /
      // Account rows; do it manually so we keep multi-provider linking
      // support AND get to write only WHITELISTED OAuth data (no AT/RT/ID
      // cookie dumps into session, ever).
      try {
        if (!user?.id || !user?.email) {
          // credentials sign-in already validates both of these via DB hit.
          // This branch is only for edge OAuth cases; skip.
        } else {
          const emailLower = String(user.email).toLowerCase();
          const existing = await prisma.user.upsert({
            where: { email: emailLower },
            create: {
              email: emailLower,
              isVerified: true,
              username:
                (typeof (user as any).username === "string" && (user as any).username) ||
                `u_${Math.random().toString(36).slice(2, 10)}`,
              displayName:
                (typeof user.name === "string" && user.name) || emailLower.split("@")[0],
              avatarUrl: (typeof user.image === "string" && user.image) || undefined,
              role: "USER",
            },
            update: {
              isVerified: true,
              displayName:
                typeof user.name === "string" && user.name
                  ? user.name
                  : undefined,
              avatarUrl:
                typeof user.image === "string" && user.image
                  ? user.image
                  : undefined,
            },
          });
          try {
            (user as any).id = existing.id;
            if (existing.role) (user as any).role = existing.role;
          } catch {
            // ignore
          }
        }
      } catch {
        // ignore transient — authorize() has already validated the sign-in.
      }

      // Session-to-user migration: move quiz responses / identity results
      // from the anonymous session-id bucket onto the signed-in user row.
      if (!user?.id) return;
      const userId = user.id as string;
      let sessionId: string | null = null;
      try {
        const jar = await cookies();
        sessionId = jar.get("whatdo_sess")?.value ?? null;
      } catch {
        // cookies() not available in edge runtime.
      }
      if (!sessionId) return;
      try {
        await prisma.$transaction(async (tx: any) => {
          await tx.questionResponse.updateMany({
            where: { sessionId, userId: null },
            data: { userId, sessionId: null },
          });
          const sessIdentity = await tx.whatDoIdentityResult.findUnique({
            where: { sessionId },
          });
          if (sessIdentity) {
            await tx.whatDoIdentityResult.delete({ where: { id: sessIdentity.id } });
            await tx.whatDoIdentityResult.upsert({
              where: { userId },
              update: {
                sessionId: null,
                whatdoType: sessIdentity.whatdoType,
                agreementPct: sessIdentity.agreementPct,
                rarityPct: sessIdentity.rarityPct,
                majorityMatches: sessIdentity.majorityMatches,
                contrarianAnswers: sessIdentity.contrarianAnswers,
                totalQuestions: sessIdentity.totalQuestions,
                cityAlignmentPct: sessIdentity.cityAlignmentPct,
                citySnapshot: sessIdentity.citySnapshot,
                strongestTrait: sessIdentity.strongestTrait,
                rarestAnswerQuestionId: sessIdentity.rarestAnswerQuestionId,
                rarestAnswerPct: sessIdentity.rarestAnswerPct,
                signalCuriosity: sessIdentity.signalCuriosity,
                signalRiskTaking: sessIdentity.signalRiskTaking,
                signalCreativity: sessIdentity.signalCreativity,
                signalSocial: sessIdentity.signalSocial,
                signalIndependence: sessIdentity.signalIndependence,
                referrerId: sessIdentity.referrerId ?? undefined,
              },
              create: {
                userId,
                whatdoType: sessIdentity.whatdoType,
                agreementPct: sessIdentity.agreementPct,
                rarityPct: sessIdentity.rarityPct,
                majorityMatches: sessIdentity.majorityMatches,
                contrarianAnswers: sessIdentity.contrarianAnswers,
                totalQuestions: sessIdentity.totalQuestions,
                cityAlignmentPct: sessIdentity.cityAlignmentPct,
                citySnapshot: sessIdentity.citySnapshot,
                strongestTrait: sessIdentity.strongestTrait,
                rarestAnswerQuestionId: sessIdentity.rarestAnswerQuestionId,
                rarestAnswerPct: sessIdentity.rarestAnswerPct,
                signalCuriosity: sessIdentity.signalCuriosity,
                signalRiskTaking: sessIdentity.signalRiskTaking,
                signalCreativity: sessIdentity.signalCreativity,
                signalSocial: sessIdentity.signalSocial,
                signalIndependence: sessIdentity.signalIndependence,
                referrerId: sessIdentity.referrerId ?? undefined,
              },
            });
          }
        });
      } catch {
        // non-fatal: user can still re-answer quiz on profile page.
      }
    },
  },
});

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username?: string;
      displayName?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: "USER" | "MODERATOR" | "ADMIN" | (string & {});
    };
  }
  interface JWT {
    id?: string;
    userId?: string;
    sub?: string;
    role?: string;
    r?: string;
    u?: string;
    username?: string;
    e?: string;
    email?: string;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id?: string;
    userId?: string;
    sub?: string;
    role?: string;
    r?: string;
    u?: string;
    username?: string;
    e?: string;
    email?: string;
  }
}
