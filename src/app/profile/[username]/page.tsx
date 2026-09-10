import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { APP_URL, USER_SELECT_PUBLIC } from "@/lib/constants";
import prisma from "@/lib/db";
import { auth } from "@/auth";
import { ProfilePageClient, PublicUserWithStats } from "./ProfilePageClient";

interface PageProps {
  params: { username: string };
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const user = await prisma.user.findUnique({
    where: { username: params.username },
    select: USER_SELECT_PUBLIC,
  });

  if (!user) {
    return {
      title: "Profile not found • WHATDO",
    };
  }

  const displayName = (user as any).displayName ?? (user as any).username ?? "User";
  const username = (user as any).username ?? "user";
  const bio = (user as any).bio ?? `See what ${displayName} is posting, voting on, and discovering on WHATDO.`;
  const avatar = (user as any).avatarUrl;

  return {
    title: `${displayName} (@${username}) • WHATDO`,
    description: bio,
    keywords: [username, displayName, "WHATDO profile"],
    authors: [{ name: displayName, url: `${APP_URL}/profile/${username}` }],
    openGraph: {
      type: "profile",
      url: `${APP_URL}/profile/${username}`,
      title: `${displayName} (@${username}) • WHATDO`,
      description: bio,
      siteName: "WHATDO",
      username,
      images: avatar
        ? [{ url: avatar, width: 400, height: 400, alt: displayName }]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `${displayName} (@${username}) • WHATDO`,
      description: bio,
      images: avatar ? [avatar] : undefined,
    },
    alternates: {
      canonical: `${APP_URL}/profile/${username}`,
    },
  };
}

export default async function ProfilePage({ params }: PageProps) {
  const user = await prisma.user.findUnique({
    where: { username: params.username },
    select: USER_SELECT_PUBLIC,
  });

  if (!user) {
    notFound();
  }

  const session = await auth();
  const currentUserId = session?.user?.id ?? null;

  const [postsCount, votesCount, followersCount, followingCount, following] =
    await Promise.all([
      prisma.post.count({
        where: {
          creatorId: (user as any).id,
          status: "PUBLISHED",
        },
      }),
      prisma.vote.count({ where: { userId: (user as any).id } }),
      prisma.follow.count({ where: { followingId: (user as any).id } }),
      prisma.follow.count({ where: { followerId: (user as any).id } }),
      currentUserId
        ? prisma.follow
            .findUnique({
              where: {
                followerId_followingId: {
                  followerId: currentUserId,
                  followingId: (user as any).id,
                },
              },
              select: { id: true },
            })
            .then((f) => !!f)
        : false,
    ]);

  const userWithStats: PublicUserWithStats = {
    ...(user as any),
    postsCount,
    votesCount,
    followersCount,
    followingCount,
    following,
    isSelf: currentUserId === (user as any).id,
  };

  return <ProfilePageClient user={userWithStats} />;
}
