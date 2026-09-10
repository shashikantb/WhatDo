import type { MetadataRoute } from "next";
import prisma from "@/lib/db";
import { APP_URL, CATEGORIES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = APP_URL.replace(/\/$/, "");

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 1,
    },
    {
      url: `${baseUrl}/feed`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 1,
    },
    {
      url: `${baseUrl}/trending`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/discover`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/ask`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/signup`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  const categoryRoutes: MetadataRoute.Sitemap = CATEGORIES.map((cat) => ({
    url: `${baseUrl}/category/${cat.slug}`,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 0.7,
  }));

  const now = new Date();
  const posts = await prisma.post.findMany({
    where: { status: "PUBLISHED" },
    orderBy: [{ createdAt: "desc" }],
    take: 500,
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const postRoutes: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${baseUrl}/post/${p.id}`,
    lastModified: p.updatedAt ?? p.createdAt,
    changeFrequency: "daily",
    priority: 0.75,
  }));

  const recentUsers = await prisma.user.findMany({
    where: { isVerified: true },
    orderBy: [{ createdAt: "desc" }],
    take: 200,
    select: { username: true, updatedAt: true, createdAt: true },
  });

  const userRoutes: MetadataRoute.Sitemap = recentUsers
    .filter((u) => !!u.username)
    .map((u) => ({
      url: `${baseUrl}/profile/${u.username}`,
      lastModified: u.updatedAt ?? u.createdAt,
      changeFrequency: "weekly",
      priority: 0.5,
    }));

  return [...staticRoutes, ...categoryRoutes, ...postRoutes, ...userRoutes];
}
