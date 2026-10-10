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
      // Prevent accidental OAuth adapter fields (access_token / refresh_token / full user objects)
      // from leaking into the JWT cookie — those produce 10+ cookie shards and cause
      // 494 REQUEST_HEADER_TOO_LARGE on Cloudflare + crash middleware.
      delete (token as any).account;
      delete (token as any).profile;
      delete (token as any).access_token;
      delete (token as any).refresh_token;
      delete (token as any).expires_in;
      delete (token as any).token_type;
      delete (token as any).scope;
      delete (token as any).id_token;
      delete (token as any).oauth_token_state;
      delete (token as any).provider;
      delete (token as any).providerAccountId;
      delete (token as any).type;
      // Keep only compact primitives on token.
      let dbRole: any = null;
      let dbId: any = null;
      if (user) {
        const anyUser = user as any;
        dbId = anyUser?.id;
        dbRole = anyUser?.role ?? anyUser?.role_name;
        if (dbId) token.id = dbId;
        if (dbRole) token.role = dbRole;
      }
      // Also strip a nested .user if OAuth2 pipeline leaked whole Prisma User row into token
      if ((token as any).user && typeof (token as any).user === "object") {
        const inner = (token as any).user as any;
        if (inner && !dbId && inner.id) token.id = inner.id;
        if (inner && !dbRole && (inner.role ?? inner.role_name)) {
          token.role = inner.role ?? inner.role_name;
        }
        delete (token as any).user;
      }
      // Whitelist: keep only the keys we want (plus iat/exp/jti — auth runtime adds these)
      const keepKeys = new Set<string>(["id", "role", "iat", "exp", "jti", "sub"]);
      for (const k of Object.keys(token)) {
        if (!keepKeys.has(k)) {
          delete (token as any)[k];
        }
      }
      return token;
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
