import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
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

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth/sign-in",
    error: "/auth/error",
  },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
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
    async jwt({ token, user, account, profile }) {
      // IMPORTANT: DO NOT MUTATE then RETURN token. Instead, return a NEW
      // plain object with ONLY id/role/iat/exp/jti/sub. This avoids:
      //   1) PrismaAdapter leaking nested account/user/profile/oauth tokens
      //      (which inflated the JWT to 35KB → 14 cookie shards → 494)
      //   2) Non-enumerable / prototype-hung fields that Object.keys() misses
      const idRaw =
        (token && typeof (token as any).id === "string" && (token as any).id) ||
        (user && typeof (user as any).id === "string" && (user as any).id) ||
        (token && typeof (token as any).user?.id === "string" && (token as any).user.id) ||
        (token && typeof token.sub === "string" ? token.sub : null);

      const roleRaw =
        (token && typeof (token as any).role === "string" && (token as any).role) ||
        (token && typeof (token as any).role_name === "string" && (token as any).role_name) ||
        (user && typeof (user as any).role === "string" && (user as any).role) ||
        (user && typeof (user as any).role_name === "string" && (user as any).role_name) ||
        (token && typeof (token as any).user?.role === "string" && (token as any).user.role) ||
        (token && typeof (token as any).user?.role_name === "string" && (token as any).user.role_name) ||
        "USER";

      const newToken: Record<string, any> = {
        iat: (token && typeof token.iat === "number" ? token.iat : Math.floor(Date.now() / 1000)),
        exp: (token && typeof token.exp === "number" ? token.exp : Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60),
      };
      if (token && typeof token.jti === "string") newToken.jti = token.jti;
      if (token && typeof token.sub === "string") newToken.sub = token.sub;
      else if (typeof idRaw === "string") newToken.sub = idRaw;
      if (typeof idRaw === "string") newToken.id = idRaw;
      newToken.role = (roleRaw as any) ?? "USER";
      // No trailing spread, no Object.assign from token — GUARANTEED minimal.
      return newToken;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id as string;
        (session.user as any).role = (token.role as string) ?? "USER";
      }
      return session;
    },
  },
  events: {
    async linkAccount({ user }) {
      await prisma.user.update({
        where: { id: user.id },
        data: { isVerified: true },
      });
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
