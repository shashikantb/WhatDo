import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Apple from "next-auth/providers/apple";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "@/lib/db";
import bcrypt from "bcryptjs";
import { z } from "zod";

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
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function validateUniqueUsername(
  username: string,
  excludeUserId?: string
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
  excludeUserId?: string
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

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
    Apple({
      clientId: process.env.AUTH_APPLE_ID,
      clientSecret: process.env.AUTH_APPLE_SECRET,
      allowDangerousEmailAccountLinking: true,
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
        return {
          id: user.id,
          email: user.email,
          username: user.username,
          displayName: user.displayName,
          role: user.role,
          image: user.avatarUrl,
        };
      },
    }),
  ],
  pages: { signIn: "/login", signOut: "/login", error: "/login" },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.uid = user.id as string;
        token.role = (user as any).role;
        token.username = (user as any).username;
      }
      if (account?.provider === "credentials" && !token.sub)
        token.sub = user?.id;
      return token;
    },
    async session({ session, token }) {
      if (token.uid && session.user) {
        session.user.id = token.uid as string;
        session.user.role = token.role as any;
        session.user.username = token.username as string;
        const fresh = await prisma.user.findUnique({
          where: { id: token.uid as string },
          select: {
            isBanned: true,
            isSuspended: true,
            suspensionExpiresAt: true,
            role: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        });
        if (fresh) {
          session.user.role = fresh.role;
          session.user.username = fresh.username;
          session.user.displayName = fresh.displayName ?? undefined;
          session.user.image = fresh.avatarUrl ?? undefined;
        }
      }
      return session;
    },
    async signIn({ user, account, profile, email, credentials }) {
      if (account?.provider !== "credentials" && user?.email) {
        const existing = await prisma.user.findUnique({
          where: { email: (user.email as string).toLowerCase() },
        });
        if (existing?.isBanned) return false;
        if (!existing) {
          let base =
            (profile as any)?.given_name ||
            (user.name || (user.email as string).split("@")[0])
              .replace(/[^a-zA-Z0-9_]/g, "_")
              .slice(0, 18);
          let username = base;
          let i = 1;
          while (!(await validateUniqueUsername(username))) {
            username = `${base.slice(0, 18)}${i++}`;
          }
          await prisma.user.update({
            where: { email: (user.email as string).toLowerCase() },
            data: { username, displayName: user.name || username },
          });
        }
      }
      return true;
    },
  },
  events: {
    async linkAccount({ user, account }) {
      if (account.provider === "google" || account.provider === "apple") {
        await prisma.user.update({
          where: { id: user.id },
          data: { isVerified: true },
        });
      }
    },
  },
});

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string;
      displayName?: string;
      role: "USER" | "MODERATOR" | "ADMIN";
      email?: string;
      image?: string;
    };
  }
  interface JWT {
    uid?: string;
    role?: "USER" | "MODERATOR" | "ADMIN";
    username?: string;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    uid?: string;
    role?: "USER" | "MODERATOR" | "ADMIN";
    username?: string;
  }
}
