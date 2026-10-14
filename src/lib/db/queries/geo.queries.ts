import { prisma } from "@/lib/db";

export interface NearbyPostsInput {
  centerLat: number;
  centerLng: number;
  radiusKm: number;
  limit?: number;
  cursor?: string; // post id cursor for pagination
  excludeFamilyPosts?: boolean; // default true
}

export interface NearbyPostResult {
  id: string;
  slug: string;
  question: string;
  type: string;
  creatorId: string;
  categoryId: string | null;
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  hideLocation: boolean;
  isFamilyPost: boolean;
  isAnonymous: boolean;
  status: string;
  voteCount: number;
  commentCount: number;
  likeCount: number;
  shareCount: number;
  createdAt: Date;
  creator: {
    id: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
    isVerified: boolean;
  } | null;
  category: { id: string; name: string; slug: string; color: string | null; icon: string | null } | null;
  distanceKm: number;
}

/**
 * Fetch posts within `radiusKm` of a center point, ordered by distance ascending.
 * Uses Postgres earthdistance (ll_to_earth / earth_distance) which operates in metres.
 * Excludes family posts by default (they are private to family members).
 */
export async function nearbyPosts(input: NearbyPostsInput): Promise<{
  items: NearbyPostResult[];
  hasMore: boolean;
  nextCursor?: string;
}> {
  const { centerLat, centerLng, radiusKm, limit = 20, cursor, excludeFamilyPosts = true } = input;
  const radiusMeters = radiusKm * 1000;
  const excludeFam = excludeFamilyPosts ? 1 : 0;
  const cursorVal = cursor ?? "";

  const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>`
    SELECT
      p.id, p.slug, p.question, p.type, p."creatorId", p."categoryId",
      p.latitude, p.longitude, p.city, p."hideLocation", p."isFamilyPost",
      p."isAnonymous", p.status, p."voteCount", p."commentCount", p."likeCount",
      p."shareCount", p."createdAt",
      u.id AS "creator_id", u.username AS "creator_username",
      u."displayName" AS "creator_displayName", u."avatarUrl" AS "creator_avatarUrl",
      u."isVerified" AS "creator_isVerified",
      c.id AS "category_id", c.name AS "category_name", c.slug AS "category_slug",
      c.color AS "category_color", c.icon AS "category_icon",
      (earth_distance(
        ll_to_earth(${centerLat}::float8, ${centerLng}::float8),
        ll_to_earth(p.latitude, p.longitude)
      ) / 1000.0)::float AS "distanceKm"
    FROM "Post" p
    LEFT JOIN "User" u ON u.id = p."creatorId"
    LEFT JOIN "Category" c ON c.id = p."categoryId"
    WHERE p.latitude IS NOT NULL
      AND p.longitude IS NOT NULL
      AND p.status = 'PUBLISHED'
      AND (${excludeFam}::int = 0 OR p."isFamilyPost" = false)
      AND earth_distance(
            ll_to_earth(${centerLat}::float8, ${centerLng}::float8),
            ll_to_earth(p.latitude, p.longitude)
          ) <= ${radiusMeters}::float8
      AND (${cursorVal}::text = '' OR p.id > ${cursorVal}::text)
    ORDER BY "distanceKm" ASC, p.id ASC
    LIMIT ${limit + 1}::int
  `;

  let hasMore = false;
  let nextCursor: string | undefined;
  if (rows.length > limit) {
    hasMore = true;
    rows.pop();
  }
  nextCursor = (rows[rows.length - 1]?.id as string) ?? undefined;

  const items: NearbyPostResult[] = rows.map((r) => ({
    id: r.id as string,
    slug: r.slug as string,
    question: r.question as string,
    type: r.type as string,
    creatorId: r.creatorId as string,
    categoryId: r.categoryId as string | null,
    latitude: r.latitude as number | null,
    longitude: r.longitude as number | null,
    city: r.city as string | null,
    hideLocation: r.hideLocation as boolean,
    isFamilyPost: r.isFamilyPost as boolean,
    isAnonymous: r.isAnonymous as boolean,
    status: r.status as string,
    voteCount: r.voteCount as number,
    commentCount: r.commentCount as number,
    likeCount: r.likeCount as number,
    shareCount: r.shareCount as number,
    createdAt: r.createdAt as Date,
    creator: r.creator_id
      ? {
          id: r.creator_id as string,
          username: r.creator_username as string | null,
          displayName: r.creator_displayName as string | null,
          avatarUrl: r.creator_avatarUrl as string | null,
          isVerified: r.creator_isVerified as boolean,
        }
      : null,
    category: r.category_id
      ? {
          id: r.category_id as string,
          name: r.category_name as string,
          slug: r.category_slug as string,
          color: r.category_color as string | null,
          icon: r.category_icon as string | null,
        }
      : null,
    distanceKm: Number(r.distanceKm),
  }));

  return { items, hasMore, nextCursor };
}
