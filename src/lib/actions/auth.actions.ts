"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { signOut, auth } from "@/auth";
import {
  hashPassword,
  validateUniqueEmail,
  validateUniqueUsername,
  verifyPassword,
} from "@/auth";
import prisma from "@/lib/db";
import { Role } from "@prisma/client";

const registerSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username can only contain letters, numbers, and underscores"
    ),
  displayName: z
    .string()
    .min(2, "Display name must be at least 2 characters")
    .max(50, "Display name must be at most 50 characters"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password must be at most 100 characters"),
});

export async function registerUser(prevState: any, formData: FormData) {
  const rawData = {
    username: formData.get("username") as string,
    displayName: formData.get("displayName") as string,
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const validated = registerSchema.safeParse(rawData);

  if (!validated.success) {
    const issues: Record<string, string> = {};
    for (const issue of validated.error.issues) {
      const path = issue.path[0] as string;
      if (path) issues[path] = issue.message;
    }
    return { success: false, message: "Validation failed", issues };
  }

  const { username, displayName, email, password } = validated.data;

  const emailAvailable = await validateUniqueEmail(email);
  const usernameAvailable = await validateUniqueUsername(username);

  const issues: Record<string, string> = {};
  if (!emailAvailable) issues.email = "Email is already registered";
  if (!usernameAvailable) issues.username = "Username is already taken";

  if (Object.keys(issues).length > 0) {
    return { success: false, message: "Validation failed", issues };
  }

  try {
    const passwordHash = await hashPassword(password);

    await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        username,
        displayName,
        passwordHash,
        role: Role.USER,
        preferences: {
          create: {},
        },
      },
    });
  } catch (error) {
    return { success: false, message: "Failed to create account" };
  }

  redirect("/onboarding");
}

export async function loginUserAction(_prev: any, formData: FormData) {
  const email = (formData.get("email") as string)?.toLowerCase();
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { success: false, error: "Invalid email or password" };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        passwordHash: true,
        isBanned: true,
        isSuspended: true,
        suspensionExpiresAt: true,
      },
    });

    if (!user || !user.passwordHash) {
      return { success: false, error: "Invalid email or password" };
    }
    if (user.isBanned) {
      return { success: false, error: "This account has been banned" };
    }
    if (
      user.isSuspended &&
      (!user.suspensionExpiresAt || user.suspensionExpiresAt > new Date())
    ) {
      return { success: false, error: "This account is currently suspended" };
    }
    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return { success: false, error: "Invalid email or password" };
    }
    return { success: true, userId: user.id };
  } catch {
    return { success: false, error: "Invalid email or password" };
  }
}

export async function logoutUserAction() {
  await signOut({ redirectTo: "/" });
}

export async function getCurrentUser() {
  const session = await auth();
  return session?.user ?? null;
}

export async function getCurrentUserOrThrow() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}
