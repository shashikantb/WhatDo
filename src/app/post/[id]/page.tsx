import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { APP_URL } from "@/lib/constants";
import prisma from "@/lib/db";
import PostPageClient from "./PostPageClient";

interface PageProps {
  params: { id: string };
}

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const identifier = params.id;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(identifier);

  const post = await prisma.post.findFirst({
    where: {
      status: "PUBLISHED",
      OR: isUuid ? [{ id: identifier }] : [{ slug: identifier }, { id: identifier }],
    },
    include: {
      creator: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          isVerified: true,
        },
      },
      category: { select: { id: true, name: true, slug: true, color: true } },
      media: { take: 1, orderBy: { sortOrder: "asc" } },
      options: {
        orderBy: { sortOrder: "asc" },
        include: {
          _count: { select: { votes: true } },
        },
      },
      _count: {
        select: { votes: true, comments: true, likes: true },
      },
    },
  });

  if (!post) {
    return {
      title: "Post not found • WHATDO",
      description: "This post may have been removed or doesn't exist.",
      robots: { index: false, follow: false },
    };
  }

  const question = post.question ?? "What do people think?";
  const categoryName = post.category?.name ?? "Opinion";
  const displayName = post.isAnonymous
    ? "Anonymous"
    : post.creator?.displayName ?? post.creator?.username ?? "Someone";
  const username = post.isAnonymous ? "anon" : post.creator?.username ?? "user";

  const totalVotes =
    (post._count?.votes ?? 0) ||
    post.options.reduce((sum: number, o: any) => sum + (o._count?.votes ?? 0), 0);

  let description = `${totalVotes.toLocaleString()} vote${totalVotes === 1 ? "" : "s"}`;
  if (post.options.length > 0 && totalVotes > 0) {
    const sortedOpts = [...post.options].sort(
      (a: any, b: any) => (b._count?.votes ?? 0) - (a._count?.votes ?? 0),
    );
    const top = sortedOpts[0];
    const topVotes = top?._count?.votes ?? 0;
    const topPct = totalVotes > 0 ? Math.round((topVotes / totalVotes) * 100) : 0;
    description = `${topPct}% ${top?.label ?? "Yes"} · ${totalVotes.toLocaleString()} vote${totalVotes === 1 ? "" : "s"}`;
  }

  const media = post.media?.[0];
  const ogImage =
    media?.posterUrl ??
    media?.thumbnailUrl ??
    media?.url ??
    `${APP_URL}/og-default.png`;

  return {
    title: `${question} • WHATDO`,
    description: `Asked by @${username} in ${categoryName} — ${description}. Cast your vote.`,
    keywords: [categoryName, username, displayName, "vote", "poll", "opinion", "WHATDO"],
    authors: post.isAnonymous
      ? undefined
      : [{ name: displayName, url: `${APP_URL}/profile/${username}` }],
    openGraph: {
      type: "article",
      url: `${APP_URL}/post/${params.id}`,
      siteName: "WHATDO",
      title: `${question} • WHATDO`,
      description: `${description}. See what ${totalVotes > 0 ? totalVotes.toLocaleString() + " people " : ""}think.`,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: question.slice(0, 100),
        },
      ],
      publishedTime: post.createdAt.toISOString(),
      section: categoryName,
    },
    twitter: {
      card: "summary_large_image",
      site: "@whatdo",
      creator: post.isAnonymous ? undefined : `@${username}`,
      title: `${question} • WHATDO`,
      description: `${description}. See what people think.`,
      images: [ogImage],
    },
  };
}

export default async function PostPage({ params }: PageProps) {
  const identifier = params.id;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(identifier);

  const exists = await prisma.post.findFirst({
    where: {
      OR: isUuid ? [{ id: identifier }] : [{ slug: identifier }, { id: identifier }],
    },
    select: { id: true, status: true },
  });

  if (!exists) {
    notFound();
  }

  if (exists.status === "REMOVED" || exists.status === "HIDDEN") {
    notFound();
  }

  return <PostPageClient params={{ id: exists.id }} />;
}
