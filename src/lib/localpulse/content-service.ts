import { prisma } from "@/lib/db";
import { getAIProvider } from "@/lib/ai";
import type { LocalPulsePostDraft } from "@/lib/ai/types";
import { getSystemSetting, GLOBAL_CONFIG_KEYS } from "@/lib/config";

const BOT_USERNAME = "localpulse_ai";
const BOT_EMAIL = "localpulse-ai@whatdo.local";
const BOT_DISPLAY_NAME = "LocalPulse AI";

/**
 * Finds (or creates) the dedicated LocalPulse AI bot user that authors
 * auto-generated LocalPulse posts.
 */
export async function getOrCreateLocalPulseBot() {
  let bot = await prisma.user.findUnique({ where: { username: BOT_USERNAME } });
  if (!bot) {
    bot = await prisma.user.create({
      data: {
        email: BOT_EMAIL,
        username: BOT_USERNAME,
        displayName: BOT_DISPLAY_NAME,
        bio: "AI-curated local moments, news, and vibes for your area.",
        isVerified: true,
        avatarUrl: null,
      },
    });
  }
  return bot;
}

/**
 * Reverse-geocode-free rough location label. Uses the user's stored city if
 * provided; otherwise falls back to coordinates.
 */
function locationLabel(lat: number, lng: number, city?: string) {
  if (city) return city;
  return `${lat.toFixed(2)}, ${lng.toFixed(2)}`;
}

/**
 * Deterministic image URL from picsum.photos seeded by the caption so the
 * same post always renders the same image. Free, no API key required.
 */
function imageUrlFor(caption: string, index: number): string {
  let hash = 0;
  for (let i = 0; i < caption.length; i++) {
    hash = (hash * 31 + caption.charCodeAt(i)) >>> 0;
  }
  const seed = `${hash}-${index}`;
  // 1080x1920 portrait (reel/short aspect ratio)
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/1080/1920`;
}

/**
 * Look up a category by slug, returning the id or null if it doesn't exist.
 */
async function categoryIdForSlug(slug: string): Promise<string | null> {
  const cat = await prisma.category.findUnique({ where: { slug }, select: { id: true } });
  return cat?.id ?? null;
}

export interface GenerateLocalPulseResult {
  created: number;
  posts: Array<{ id: string; slug: string; caption: string }>;
}

/**
 * Generate N AI LocalPulse (SHORT) posts for a given location and persist
 * them as PUBLISHED posts authored by the LocalPulse AI bot.
 *
 * - Content is non-controversial, funny/informative/interesting, ages 10–30.
 * - Posts carry the provided lat/lng so they appear in the nearby feed.
 * - Images come from picsum.photos (portrait reel format).
 */
export async function generateLocalPulsePosts(params: {
  latitude: number;
  longitude: number;
  city?: string;
  count: number;
}): Promise<GenerateLocalPulseResult> {
  const { latitude, longitude, city, count } = params;
  const place = locationLabel(latitude, longitude, city);

  const ai = getAIProvider();
  let drafts: LocalPulsePostDraft[];
  try {
    drafts = await ai.generateLocalPulseContent({ latitude, longitude, city }, count);
  } catch {
    drafts = [];
  }
  if (drafts.length === 0) return { created: 0, posts: [] };

  const bot = await getOrCreateLocalPulseBot();

  const created: GenerateLocalPulseResult["posts"] = [];

  for (let i = 0; i < drafts.length; i++) {
    const draft = drafts[i]!;
    const caption = draft.caption.trim();
    if (caption.length < 10) continue;

    const categoryId = draft.categorySlug
      ? await categoryIdForSlug(draft.categorySlug)
      : null;

    const tempCuid = `c${Math.random().toString(36).slice(2, 14)}`;
    const slug = tempCuid.slice(Math.max(0, tempCuid.length - 10));

    const tags = (draft.tags ?? []).slice(0, 10);
    const tagRows = await Promise.all(
      tags.map(async (tagName) => {
        const slugTag = tagName
          .toLowerCase()
          .replace(/[^a-z0-9-_]/g, "-")
          .replace(/-+/g, "-")
          .slice(0, 50);
        return prisma.tag.upsert({
          where: { slug: slugTag },
          create: { name: tagName.slice(0, 50), slug: slugTag, postCount: 1 },
          update: { postCount: { increment: 1 } },
        });
      }),
    );

    const imageUrl = imageUrlFor(caption, i);

    const post = await prisma.post.create({
      data: {
        slug,
        creatorId: bot.id,
        categoryId,
        type: "SHORT",
        question: caption,
        isAnonymous: false,
        allowComments: true,
        status: "PUBLISHED",
        latitude,
        longitude,
        city: city ?? null,
        isFamilyPost: false,
        hideLocation: false,
        media: {
          create: [
            {
              type: "IMAGE",
              url: imageUrl,
              mimeType: "image/jpeg",
              width: 1080,
              height: 1920,
              sortOrder: 0,
            },
          ],
        },
        tags: {
          create: tagRows.map((t) => ({ tagId: t.id })),
        },
      },
      select: { id: true, slug: true, question: true },
    });

    created.push({ id: post.id, slug: post.slug, caption: post.question });
  }

  return { created: created.length, posts: created };
}

/**
 * Returns the current LocalPulse auto-generation settings.
 */
export async function getLocalPulseAutoGenSettings() {
  const [enabled, maxPerLocation, minNearbyPosts] = await Promise.all([
    getSystemSetting<boolean>(GLOBAL_CONFIG_KEYS.LOCALPULSE_AUTOGEN_ENABLED, false),
    getSystemSetting<number>(GLOBAL_CONFIG_KEYS.LOCALPULSE_AUTOGEN_MAX_PER_LOCATION, 2),
    getSystemSetting<number>(GLOBAL_CONFIG_KEYS.LOCALPULSE_AUTOGEN_MIN_NEARBY_POSTS, 3),
  ]);
  return { enabled, maxPerLocation, minNearbyPosts };
}

/**
 * Count published, non-family posts within radiusKm of a point.
 * Used to decide whether seed content is needed.
 */
export async function countNearbyPosts(
  latitude: number,
  longitude: number,
  radiusKm: number,
): Promise<number> {
  const radiusMeters = radiusKm * 1000;
  const rows = await prisma.$queryRaw<Array<{ cnt: bigint }>>`
    SELECT COUNT(*)::int AS cnt
    FROM "Post" p
    WHERE p.status = 'PUBLISHED'
      AND p."isFamilyPost" = false
      AND p.latitude IS NOT NULL
      AND p.longitude IS NOT NULL
      AND earth_distance(
        ll_to_earth(p.latitude, p.longitude),
        ll_to_earth(${latitude}, ${longitude})
      ) <= ${radiusMeters}
  `;
  const first = rows[0];
  if (!first) return 0;
  return Number(first.cnt ?? 0);
}
