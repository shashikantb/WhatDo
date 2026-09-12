import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/../auth";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const fetchCache = "force-no-store";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { categorySlugs } = body as { categorySlugs: string[] };

    if (!Array.isArray(categorySlugs)) {
      return NextResponse.json(
        { success: false, message: "Invalid category slugs" },
        { status: 400 }
      );
    }

    const categories = await prisma.category.findMany({
      where: { slug: { in: categorySlugs } },
      select: { id: true },
    });

    if (categories.length > 0) {
      const data = categories.map((cat) => ({
        userId: session.user.id,
        categoryId: cat.id,
      }));

      await prisma.userCategoryInterest.createMany({
        data,
        skipDuplicates: true,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Failed to save category interests" },
      { status: 500 }
    );
  }
}
