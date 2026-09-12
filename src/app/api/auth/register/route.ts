import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  hashPassword,
  validateUniqueEmail,
  validateUniqueUsername,
} from "@/../auth";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const fetchCache = "force-no-store";
import { Role } from "@prisma/client";

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = registerSchema.safeParse(body);

    if (!validated.success) {
      const issues: Record<string, string> = {};
      for (const issue of validated.error.issues) {
        const path = issue.path[0] as string;
        if (path) issues[path] = issue.message;
      }
      return NextResponse.json(
        { success: false, message: "Validation failed", issues },
        { status: 400 }
      );
    }

    const { username, displayName, email, password } = validated.data;

    const emailAvailable = await validateUniqueEmail(email);
    const usernameAvailable = await validateUniqueUsername(username);

    const issues: Record<string, string> = {};
    if (!emailAvailable) issues.email = "Email is already registered";
    if (!usernameAvailable) issues.username = "Username is already taken";

    if (Object.keys(issues).length > 0) {
      return NextResponse.json(
        { success: false, message: "Validation failed", issues },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
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
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
      },
    });

    return NextResponse.json(
      { success: true, user, redirectTo: "/onboarding" },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Failed to create account" },
      { status: 500 }
    );
  }
}
