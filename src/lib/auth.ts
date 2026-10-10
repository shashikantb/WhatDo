import NextAuth from "next-auth";
import {
  encode as defaultJwtEncode,
  decode as defaultJwtDecode,
} from "@auth/core/jwt";
import Google from "next-auth/providers/google";
import Apple from "next-auth/providers/apple";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { z } from "zod";
import prisma from "./db";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

// NOTE: Adapter deliberately REMOVED from NextAuth below.
//
// WHY: PrismaAdapter + JWT session strategy + Credentials + linked OAuth accounts
// (e.g. a user who also signed in with Google in the past) caused a critical bug:
// when the same user had 2+ rows in the `accounts` table (google + credentials),
// NextAuth routed the Credentials sign-in through an *OAuth-style* code path in
//   node_modules/@auth/core/lib/actions/callback/index.js
// which:
//   (a) completely SKIPPED our jwt() callback — so every attempt to whitelist the
//       JWT payload did not run;
//   (b) merged the FULL Google Account row (access_token / refresh_token / id_token
//       / scope / providerAccountId / etc.) into the session token;
//   (c) produced a 35KB+ JWT which sharded into 14 cookies, bursting Cloudflare's
//       8KB Cookie header and causing the reported 494 / 500 login crash.
//
// Credentials sign-in does not need an adapter (authorize() below already hits prisma).
// Google/Apple OAuth sign-ins still work: NextAuth falls back to JWT-only sessions
// and still populates token.name / token.email / token.picture / token.sub from the
// id_token. Any account linkage / user upsert we want on OAuth sign-in must happen
// manually inside the events.signIn callback below.

/**
 * HARD WHITELIST — applied in jwt.encode() as the absolute last step before
 * encryption. Even if jwt() callback, signIn() events or NextAuth internals
 * merge 35KB of Google OAuth tokens / Account rows into the token object by
 * reference, this strips everything back to the 6 keys allowed in the
 * encoded cookie. Keeps session cookies ~1 shard and prevents 494.
 */
function sanitizeTokenPayload(token: any): Record<string, unknown> {
  const raw = (token && typeof token === "object") ? (token as Record<string, any>) : {};
  const out: Record<string, unknown> = {};
  // Preserve JWT bookkeeping (required by @auth/core encode internals after
  // the iat check + session expiry). These 3 are re-added by jose during
  // encode too, but forwarding them keeps jti stable if it was set.
  if (typeof raw.iat === "number") out.iat = raw.iat;
  if (typeof raw.exp === "number") out.exp = raw.exp;
  if (typeof raw.jti === "string") out.jti = raw.jti;
  // Identity: pick canonical id/sub in priority order. If nothing present,
  // drop it — decode-side returns null = anonymous, which is fine.
  const sub =
    (typeof raw.id === "string" && raw.id) ||
    (typeof raw.sub === "string" && raw.sub) ||
    null;
  if (sub) {
    out.sub = sub;
    out.id = sub;
  }
  // Role: normalized string, default USER.
  const role =
    (typeof raw.role === "string" && raw.role) ||
    (typeof raw.role_name === "string" && raw.role_name) ||
    "USER";
  out.role = role;
  return out;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth/sign-in",
    error: "/auth/error",
  },
  // FINAL-GATE whitelist: regardless of what jwt() callback or NextAuth
  // internals produce, we re-sanitize the token right before encryption so
  // the JWE ciphertext can never exceed ~1 shard. Root cause was OAuth
  // tokens being dumped wholesale by upstream sign-in paths for linked
  // accounts (54KB → 14 shards → 494). This encode() override is the last
  // line of defense.
  jwt: {
    async encode(params) {
      // Never throw; on any failure, fall back to the default encoder with
      // the sanitized token so the user still gets a session.
      try {
        const { token, ...rest } = params as any;
        const sanitized = sanitizeTokenPayload(token);
        return await defaultJwtEncode({ ...(rest as any), token: sanitized });
      } catch (err) {
        const { token, ...rest } = params as any;
        const fallback = sanitizeTokenPayload(token);
        return await defaultJwtEncode({ ...(rest as any), token: fallback });
      }
    },
    async decode(params) {
      return await defaultJwtDecode(params as any);
    },
  },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
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
        const validated = credentialsSchema.safeParse(credentials);
        if (!validated.success) {
          return null;
        }

        const { email, password } = validated.data;
        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
        });

        if (!user || !user.passwordHash) {
          return null;
        }

        const passwordMatch = await compare(password, user.passwordHash);
        if (!passwordMatch) {
          return null;
        }

        return {
          id: user.id,
          name: user.displayName,
          email: user.email,
          image: user.avatarUrl,
          role: user.role as any,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Without PrismaAdapter, the jwt callback ALWAYS runs for every sign-in
      // (Credentials, Google, Apple). Build a GUARANTEED-minimal 6-key token:
      // Return a NEW plain object (never mutate-then-return) so no stray
      // fields from OAuth/profile leaks into the encoded JWT.
      const idRaw: string | null =
        (user && typeof (user as any).id === "string" && (user as any).id) ||
        (token && typeof (token as any).id === "string" && (token as any).id) ||
        (token && typeof token.sub === "string" ? token.sub : null);

      const roleRaw: any =
        (user && typeof (user as any).role === "string" && (user as any).role) ||
        (user && typeof (user as any).role_name === "string" && (user as any).role_name) ||
        (token && typeof (token as any).role === "string" && (token as any).role) ||
        (token && typeof (token as any).role_name === "string" && (token as any).role_name) ||
        "USER";

      const newToken: Record<string, any> = {
        iat: (token && typeof token.iat === "number" ? token.iat : Math.floor(Date.now() / 1000)),
        exp: (token && typeof token.exp === "number" ? token.exp : Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60),
      };
      if (token && typeof token.jti === "string") newToken.jti = token.jti;
      if (typeof idRaw === "string") {
        newToken.sub = idRaw;
        newToken.id = idRaw;
      } else if (token && typeof token.sub === "string") {
        newToken.sub = token.sub;
      }
      newToken.role = (roleRaw as any) ?? "USER";
      return newToken;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = (token.id as string) || (token.sub as string) || "";
        (session.user as any).role = (token.role as string) ?? "USER";
      }
      return session;
    },
  },
  events: {
    async signIn({ user, account }) {
      // Without PrismaAdapter, we need to manually ensure:
      //   a) an email-verified OAuth sign-in marks the user verified
      //   b) user rows exist for OAuth sign-ups (upsert by email)
      try {
        const email = user?.email;
        if (!email || typeof email !== "string") return;
        const provider = account?.provider || "";
        const isOAuthVerify =
          provider === "google" || provider === "apple";
        const data: any = {
          email: email.toLowerCase(),
          isVerified: !!isOAuthVerify,
        };
        if (typeof user.name === "string" && user.name) {
          data.displayName = data.displayName || user.name;
        }
        if (typeof user.image === "string" && user.image) {
          data.avatarUrl = data.avatarUrl || user.image;
        }
        const upserted = await prisma.user.upsert({
          where: { email: email.toLowerCase() },
          create: {
            ...data,
            displayName: data.displayName || email.split("@")[0] || "User",
          },
          update: {
            ...data,
            displayName: undefined,
            avatarUrl: undefined,
          },
        });
        // Stamp canonical DB id/role onto the user object so downstream jwt
        // callback picks up the real Prisma id/role (instead of OAuth sub).
        try {
          (user as any).id = upserted.id;
          if (upserted.role) (user as any).role = upserted.role;
        } catch {}
        // Save linked Account row if we have account info (keeps parity with
        // former PrismaAdapter, supports future multi-provider linking).
        try {
          if (account && account.providerAccountId) {
            await prisma.account.upsert({
              where: {
                provider_providerAccountId: {
                  provider: String(account.provider),
                  providerAccountId: String(account.providerAccountId),
                },
              },
              create: {
                userId: upserted.id,
                provider: String(account.provider),
                providerAccountId: String(account.providerAccountId),
                type: String((account as any).type || "oauth"),
                access_token: typeof (account as any).access_token === "string" ? String((account as any).access_token).substring(0, 2048) : null,
                refresh_token: typeof (account as any).refresh_token === "string" ? String((account as any).refresh_token).substring(0, 2048) : null,
                expires_at: typeof (account as any).expires_at === "number" ? (account as any).expires_at : null,
                token_type: typeof (account as any).token_type === "string" ? String((account as any).token_type) : null,
                scope: typeof (account as any).scope === "string" ? String((account as any).scope) : null,
                id_token: typeof (account as any).id_token === "string" ? String((account as any).id_token).substring(0, 8192) : null,
                session_state: typeof (account as any).session_state === "string" ? String((account as any).session_state) : null,
              },
              update: {
                type: String((account as any).type || "oauth"),
                access_token: typeof (account as any).access_token === "string" ? String((account as any).access_token).substring(0, 2048) : undefined,
                refresh_token: typeof (account as any).refresh_token === "string" ? String((account as any).refresh_token).substring(0, 2048) : undefined,
                expires_at: typeof (account as any).expires_at === "number" ? (account as any).expires_at : undefined,
                token_type: typeof (account as any).token_type === "string" ? String((account as any).token_type) : undefined,
                scope: typeof (account as any).scope === "string" ? String((account as any).scope) : undefined,
                id_token: typeof (account as any).id_token === "string" ? String((account as any).id_token).substring(0, 8192) : undefined,
                session_state: typeof (account as any).session_state === "string" ? String((account as any).session_state) : undefined,
              },
            });
          }
        } catch {}
      } catch {}
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
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: any;
  }
}
