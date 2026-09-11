import {
  PrismaClient,
  Role,
  PostType,
  PostStatus,
  ReportType,
  ReportReason,
  ReportStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Run Promise-returning functions in chunks (sequential between chunks, parallel within a chunk).
 * Prevents Neon Free 1CU P2024 pool exhaustion on large seed inserts.
 */
async function runChunked<T>(
  name: string,
  makePromises: () => Promise<T>[],
  options: { chunkSize?: number; sleepMs?: number; parallelFactor?: number } = {}
): Promise<T[]> {
  const chunkSize = options.chunkSize ?? 200;
  const sleepMs = options.sleepMs ?? 250;
  const parallelFactor = options.parallelFactor ?? 1;
  const all = makePromises();
  if (all.length === 0) return [];
  const chunks = chunkArray(all, Math.max(1, Math.round(chunkSize / parallelFactor)));
  const results: T[] = [];
  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i];
    if (!c) continue;
    // eslint-disable-next-line no-await-in-loop
    results.push(...((await Promise.all(c as unknown as Promise<T>[])) as T[]));
    if (i !== chunks.length - 1 && sleepMs > 0) {
      // eslint-disable-next-line no-await-in-loop
      await sleep(sleepMs);
    }
  }
  console.log(`   → ${name}: ${all.length} ops in ${chunks.length} chunks (${chunkSize}/chunk)`);
  return results;
}

const FIRST_NAMES = [
  "Alex", "Nisha", "Sam", "Priya", "Jordan", "Rahul", "Taylor", "Aisha",
  "Morgan", "Vikram", "Casey", "Sana", "Devin", "Ananya", "Riley", "Karan",
  "Jamie", "Meera", "Avery", "Arjun", "Quinn", "Divya", "Rowan", "Siddharth",
  "Skyler", "Ishani", "Reese", "Rohan", "Finley", "Tanvi", "Cameron", "Neha",
  "Parker", "Aditya", "Drew", "Shruti", "Emerson", "Kunal", "Hayden", "Ritu",
  "Phoenix", "Abhinav", "Sage", "Pooja", "Kai", "Varun", "Marlowe", "Isha",
  "Sawyer", "Lakshya",
];

const LAST_NAMES = [
  "Patel", "Sharma", "Khan", "Joshi", "Singh", "Kumar", "Verma", "Gupta",
  "Anderson", "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia",
  "Miller", "Davis", "Martinez", "Lopez", "Wilson", "Reddy", "Nair", "Iyer",
  "Menon", "Bose", "Das", "Chatterjee", "Banerjee", "Mukherjee", "Rao",
  "Thompson", "Robinson", "Clark", "Lewis", "Walker", "Hall", "Allen",
  "Young", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores",
  "Green", "Adams", "Nelson", "Baker",
];

const AVATAR_STYLES = [
  "adventurer", "avataaars", "big-smile", "lorelei", "micah",
  "miniavs", "notionists", "pixel-art",
];

const CATEGORIES = [
  { name: "Technology", slug: "technology", icon: "Cpu", color: "#3B82F6", description: "Latest tech news, gadgets, and innovations" },
  { name: "AI", slug: "ai", icon: "Bot", color: "#8B5CF6", description: "Artificial intelligence, machine learning, and LLMs" },
  { name: "Startups", slug: "startups", icon: "Rocket", color: "#F59E0B", description: "Startup culture, funding, and entrepreneurship" },
  { name: "Business", slug: "business", icon: "Briefcase", color: "#10B981", description: "Business strategies, markets, and economics" },
  { name: "Money", slug: "money", icon: "DollarSign", color: "#059669", description: "Personal finance, investing, and wealth building" },
  { name: "Fashion", slug: "fashion", icon: "Shirt", color: "#EC4899", description: "Style trends, clothing, and accessories" },
  { name: "Food", slug: "food", icon: "UtensilsCrossed", color: "#EF4444", description: "Recipes, restaurants, and culinary experiences" },
  { name: "Travel", slug: "travel", icon: "Plane", color: "#06B6D4", description: "Destinations, tips, and adventure stories" },
  { name: "Cars", slug: "cars", icon: "Car", color: "#6366F1", description: "Automotive news, reviews, and car culture" },
  { name: "Movies", slug: "movies", icon: "Film", color: "#DC2626", description: "Film reviews, trailers, and cinema discussions" },
  { name: "Music", slug: "music", icon: "Music", color: "#A855F7", description: "Albums, artists, concerts, and music discovery" },
  { name: "Gaming", slug: "gaming", icon: "Gamepad2", color: "#22C55E", description: "Video games, esports, and gaming culture" },
  { name: "Sports", slug: "sports", icon: "Trophy", color: "#F97316", description: "Sports news, scores, and athlete discussions" },
  { name: "Design", slug: "design", icon: "Palette", color: "#E11D48", description: "UI/UX, graphic design, and creative work" },
  { name: "Lifestyle", slug: "lifestyle", icon: "Sparkles", color: "#14B8A6", description: "Daily living, wellness, and life hacks" },
  { name: "Relationships", slug: "relationships", icon: "Heart", color: "#F43F5E", description: "Dating, love, family, and friendships" },
  { name: "Education", slug: "education", icon: "GraduationCap", color: "#2563EB", description: "Learning, schools, and academic topics" },
  { name: "Career", slug: "career", icon: "Building2", color: "#4F46E5", description: "Jobs, interviews, and professional growth" },
  { name: "Shopping", slug: "shopping", icon: "ShoppingBag", color: "#D946EF", description: "Product reviews, deals, and recommendations" },
  { name: "Funny", slug: "funny", icon: "Laugh", color: "#FBBF24", description: "Memes, jokes, and hilarious content" },
  { name: "Random", slug: "random", icon: "Shuffle", color: "#64748B", description: "Miscellaneous and off-topic discussions" },
  { name: "Viral", slug: "viral", icon: "Zap", color: "#CA8A04", description: "Trending and viral internet moments" },
];

const REALISTIC_QUESTIONS = [
  "Would you buy this AI phone for ₹69,999?",
  "Which logo is better for my SaaS: A or B?",
  "Rate this interior design 1–10",
  "How much would you pay for a month of this product?",
  "Should I quit my job and do startups full time?",
  "Will Nifty hit 30,000 by December?",
  "Would you visit Mars if tickets cost $100k?",
  "Is this the future of cars?",
  "Which smartphone should I buy?",
  "Coffee or Tea?",
  "SaaS pricing per-seat or flat?",
  "Best programming language in 2026?",
  "Remote work vs office: which is better?",
  "Is a Master's degree still worth it?",
  "Should India adopt 4-day work weeks?",
  "Will AI replace junior developers by 2028?",
  "Rate this landing page design 1-10",
  "iPhone vs Android: which ecosystem?",
  "Is paying for Twitter/X Blue worth it?",
  "Best city to live in India for tech?",
  "Buy vs Rent a home in 2026?",
  "Should I learn Rust or Go next?",
  "Is YouTube better than Netflix now?",
  "Pick your next vacation: Bali or Switzerland?",
  "Dark mode or Light mode?",
  "MacBook vs ThinkPad for coding?",
  "Is crypto dead or just hibernating?",
  "Should startups build mobile first or web first?",
  "Rate my portfolio website 1–10",
  "Does this startup idea have legs?",
  "Gym membership vs home workout?",
  "Tea: Milk tea or Black tea?",
  "Veg vs Non-Veg: which is healthier?",
  "Should kids under 13 use smartphones?",
  "Will Nvidia hit $10T market cap by 2027?",
  "Bootstrap vs VC funding: which path?",
  "Which haircut suits me better, A or B?",
  "Should I start posting on LinkedIn?",
  "Freelancing vs 9-5 job?",
  "India vs Australia: who wins the next series?",
  "Is React still the best frontend framework?",
  "Would you pay ₹199/month for this fitness app?",
  "Should I take a gap year after graduation?",
  "Best language for AI/ML in 2026?",
  "Are e-scooters the future of commute?",
  "Which design system: Tailwind UI vs shadcn?",
  "Rent co-living vs 1BHK apartment?",
  "Should brands move from Instagram to Threads?",
  "Are headphones better than earbuds?",
  "Should I switch to a standing desk?",
  "Does the Meta Quest 3 VR headset justify its price?",
  "Will the next iPhone ditch Lightning fully?",
  "Is SEO still relevant with AI search?",
  "Salary vs Equity: which matters more?",
  "Should India ban single-use plastic completely?",
  "Is this thumbnail clickbait? (honest answers)",
  "Buy Tesla Model 3 or wait for cheaper EV?",
  "DevOps or Full-stack: which career?",
  "Do you keep your phone always on silent?",
  "Solo founder vs co-founder team?",
  "Morning person or Night owl?",
  "Which tastes better: Pizza or Burger?",
  "Would you work 4 days for 80% salary?",
  "Are remote teams less productive?",
  "SaaS: Freemium vs Free Trial?",
  "Should I pursue MBA after 3 years of work?",
  "Rate this startup pitch deck 1–10",
  "Which is safer: Cab or public transport?",
  "Would you move to Tier 2 city for WFH?",
  "Is DSA still needed for product jobs?",
  "Content creation: long-form or short-form?",
  "Are electric bikes worth the premium?",
  "Should I learn design as a developer?",
  "Bangalore vs Mumbai for startup HQ?",
  "Rate this mobile app UI 1–10",
  "Paper books vs Kindle?",
  "Will the US Fed cut rates next quarter?",
  "Startup: build in public or stay stealth?",
  "Tea or coffee first thing in the morning?",
  "Should I invest 30% salary in mutual funds?",
  "Is Spotify Premium worth the price hike?",
  "Which has better ROI: MBA or upskilling courses?",
  "Would you ride a self-driving taxi?",
  "Chai from tapri vs café: which is better?",
  "Should coding be taught from Class 5?",
  "Is Figma still the best after Adobe acquisition?",
  "Rate my LinkedIn profile (DM me after voting)",
  "Pomodoro technique: does it work for you?",
  "India needs more IITs or more Industry 4.0 jobs?",
  "Will solar panels on every home become mandatory?",
  "Cricket or Football: better to follow?",
  "Is reading 12 books a year realistic?",
  "Which mountain view, A or B, is more calming?",
  "Should product managers code?",
  "Can AI write truly original creative fiction?",
  "Should I invest in gold or S&P 500 index now?",
  "Are open floor offices dead finally?",
  "Should friends lend friends money?",
  "Is 8 hours of sleep really non-negotiable?",
  "Will SpaceX Starship fly people to Mars in 5 years?",
  "Cold showers: yay or nay?",
  "Can a bootstrapped startup beat a funded one?",
  "Is journaling actually life-changing?",
  "Will Bitcoin hit $150k in 2026?",
];

const COMMENT_TEMPLATES = [
  "I think this is a game changer.",
  "No way, too expensive.",
  "Option A has better UX.",
  "Boring, next.",
  "Would love to try.",
  "Could you share more info?",
  "Wow, didn't expect that.",
  "Both options are great honestly.",
  "Definitely yes on this one.",
  "Personally, I'd go with B.",
  "This needs more context.",
  "Let's gooooo.",
  "Hard disagree but respect the question.",
  "Can we get a follow-up post?",
  "Been thinking the same for weeks.",
  "Who else voted A? 🙋",
  "Price point kills it for me.",
  "Wait, let me think again.",
  "Source? Would love to read more.",
  "This will age like fine wine.",
  "Nope, not for me.",
  "Early adopter energy right here.",
  "Waiting for more votes to decide.",
  "Design in A is clean AF.",
  "As a dev, I can confirm this.",
  "My parents would love option B.",
  "Try both then decide, duh.",
  "Results are wild, love it.",
  "Thank you for asking this.",
  "Lowkey genius question.",
];

const EMOJI_REACTIONS = ["🔥", "😂", "🤔", "😍", "😮", "👏", "💯", "🚀"];

function pick<T>(arr: T[]): T {
  if (arr.length === 0) throw new Error("pick() called on empty array");
  const idx = Math.floor(Math.random() * arr.length);
  const v = arr[idx];
  if (v === undefined) throw new Error("pick() undefined result");
  return v;
}

function pickMany<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  while (out.length < n && copy.length > 0) {
    const i = Math.floor(Math.random() * copy.length);
    const v = copy.splice(i, 1)[0];
    if (v !== undefined) out.push(v);
  }
  return out;
}

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function at<T>(arr: T[], i: number): T {
  if (arr.length === 0) throw new Error("at() called on empty array");
  const mod = ((i % arr.length) + arr.length) % arr.length;
  const v = arr[mod];
  if (v === undefined) throw new Error(`at() undefined at index ${mod}`);
  return v;
}

function avatarUrl(seed: string, idx: number): string {
  const style = at(AVATAR_STYLES, idx);
  return `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seed)}`;
}

async function main() {
  console.log("🌱 WHATDO seed starting...");
  const salt = bcrypt.genSaltSync(10);
  const PASSWORD = bcrypt.hashSync("whatdo1234", salt);
  const ADMIN_PASSWORD = bcrypt.hashSync("admin1234", salt);

  console.log("🧹 Cleaning existing data (cascade)...");
  await prisma.$transaction([
    prisma.predictionResult.deleteMany(),
    prisma.prediction.deleteMany(),
    prisma.moderationEvent.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.report.deleteMany(),
    prisma.postTag.deleteMany(),
    prisma.savedPost.deleteMany(),
    prisma.like.deleteMany(),
    prisma.follow.deleteMany(),
    prisma.commentLike.deleteMany(),
    prisma.comment.deleteMany(),
    prisma.vote.deleteMany(),
    prisma.postOption.deleteMany(),
    prisma.postMedia.deleteMany(),
    prisma.post.deleteMany(),
    prisma.tag.deleteMany(),
    prisma.userCategoryInterest.deleteMany(),
    prisma.userPreferences.deleteMany(),
    prisma.analyticsEvent.deleteMany(),
    prisma.userMute.deleteMany(),
    prisma.userBlock.deleteMany(),
    prisma.session.deleteMany(),
    prisma.account.deleteMany(),
    prisma.category.deleteMany(),
    prisma.user.deleteMany(),
    prisma.verificationToken.deleteMany(),
    prisma.adConfiguration.deleteMany(),
  ]);
  console.log("✅ Cleanup complete");

  console.log("👥 Creating users (50 + 1 admin + 2 extra admins + 6 mods)...");
  const roles: Role[] = [];
  for (let i = 0; i < 50; i++) {
    if (i < 2) roles.push(Role.ADMIN);
    else if (i < 8) roles.push(Role.MODERATOR);
    else roles.push(Role.USER);
  }

  const userData: any[] = [];
  const usedUsernames = new Set<string>();
  for (let i = 0; i < 50; i++) {
    const first = at(FIRST_NAMES, i);
    const last = at(LAST_NAMES, i * 7);
    let username = `${first.toLowerCase()}_${last.charAt(0).toLowerCase()}`;
    let suffix = 1;
    while (usedUsernames.has(username)) {
      username = `${first.toLowerCase()}_${last.charAt(0).toLowerCase()}${suffix}`;
      suffix++;
    }
    usedUsernames.add(username);

    const displayName = `${first} ${last}`;
    const email = `${username}+${rand(10, 9999)}@example.com`;
    const isVerified = Math.random() < 0.1;
    userData.push({
      email,
      username,
      displayName,
      role: at(roles, i),
      passwordHash: PASSWORD,
      avatarUrl: avatarUrl(username, i),
      bio: pick([
        null, null, null, null,
        "Building cool things on the internet ✨",
        "Designer · Coffee addict · Traveler",
        "Software engineer by day, reader by night",
        "Opinions are my own. Let's vote.",
        "Curious human asking big questions.",
      ] as any),
      isVerified,
      lastActiveAt: new Date(Date.now() - rand(0, 60) * 86400_000),
    });
  }

  const adminUser = await prisma.user.create({
    data: {
      email: "admin@whatdo.app",
      username: "admin",
      displayName: "Admin WHATDO",
      role: Role.ADMIN,
      passwordHash: ADMIN_PASSWORD,
      avatarUrl: avatarUrl("admin_whatdo", 0),
      isVerified: true,
      bio: "The official WHATDO admin. Here to help.",
    },
  });

  const createdUsers = await Promise.all(
    userData.map((u) => prisma.user.create({ data: u }))
  );
  const allUsers = [adminUser, ...createdUsers];
  console.log(`✅ Created ${allUsers.length} total users`);

  console.log("📂 Creating categories...");
  await Promise.all(
    CATEGORIES.map((c, i) =>
      prisma.category.create({
        data: {
          name: c.name,
          slug: c.slug,
          icon: c.icon,
          color: c.color,
          description: c.description,
          sortOrder: i,
          isActive: true,
        },
      })
    )
  );
  const allCategories = await prisma.category.findMany({
    select: { id: true, slug: true },
  });
  console.log(`✅ Created ${allCategories.length} categories`);

  console.log("💬 Creating 100 posts...");

  const POST_TYPE_DIST: PostType[] = [
    ...Array(40).fill(PostType.YES_NO),
    ...Array(15).fill(PostType.MULTIPLE_CHOICE),
    ...Array(5).fill(PostType.POLL),
    ...Array(10).fill(PostType.A_VS_B),
    ...Array(10).fill(PostType.RATING),
    ...Array(10).fill(PostType.EMOJI),
    ...Array(5).fill(PostType.DECISION),
    ...Array(5).fill(PostType.PREDICTION),
  ];

  type OptionDef = { label: string; value: string; sortOrder: number };

  function optionsFor(type: PostType, question: string): OptionDef[] {
    switch (type) {
      case PostType.YES_NO:
      case PostType.DECISION:
      case PostType.PREDICTION:
        return [
          { label: "Yes", value: "yes", sortOrder: 0 },
          { label: "No", value: "no", sortOrder: 1 },
        ];
      case PostType.A_VS_B:
        return [
          { label: "A", value: "A", sortOrder: 0 },
          { label: "B", value: "B", sortOrder: 1 },
        ];
      case PostType.MULTIPLE_CHOICE: {
        const opts = [
          ["Option 1", "Option 2", "Option 3", "Option 4"],
          ["React", "Vue", "Svelte", "Solid"],
          ["Remote", "Hybrid", "In-office"],
          ["Python", "JS", "Rust", "Go"],
          ["Netflix", "Prime", "Hotstar", "JioCinema"],
        ];
        const chosen = pick(opts);
        return chosen.map((l, i) => ({ label: l, value: slugify(l), sortOrder: i }));
      }
      case PostType.POLL: {
        const opts = [
          ["Strongly agree", "Agree", "Neutral", "Disagree", "Strongly disagree"],
          ["Excellent", "Good", "Okay", "Poor", "Terrible"],
          ["Daily", "Few times a week", "Monthly", "Rarely", "Never"],
        ];
        const chosen = pick(opts);
        return chosen.map((l, i) => ({ label: l, value: slugify(l), sortOrder: i }));
      }
      case PostType.RATING:
        return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => ({
          label: String(n),
          value: String(n),
          sortOrder: n - 1,
        }));
      case PostType.EMOJI:
        return EMOJI_REACTIONS.slice(0, 6).map((e, i) => ({
          label: e,
          value: e,
          sortOrder: i,
        }));
      default:
        return [{ label: "Yes", value: "yes", sortOrder: 0 }];
    }
  }

  const postDefs: any[] = [];
  const trendingIndices = new Set(pickMany([...Array(100).keys()], 10));

  for (let i = 0; i < 100; i++) {
    const creator = pick(allUsers);
    const postType = at(POST_TYPE_DIST, i);
    const question = at(REALISTIC_QUESTIONS, i);
    const categorySlugs = ["technology", "ai", "startups", "money", "career", "lifestyle", "design", "food", "movies", "gaming"];
    const chosenCatSlug = at(categorySlugs, i);
    const category = allCategories.find((c) => c.slug === chosenCatSlug) ?? at(allCategories, 0);

    const isTrending = trendingIndices.has(i);
    const createdAt = new Date(Date.now() - rand(0, 30) * 86400_000 - rand(0, 23) * 3600_000);
    const isPrediction = postType === PostType.PREDICTION;
    const closeAt = isPrediction
      ? new Date(createdAt.getTime() + rand(3, 60) * 86400_000)
      : Math.random() < 0.2
      ? new Date(createdAt.getTime() + rand(1, 30) * 86400_000)
      : null;

    postDefs.push({
      slug: `${slugify(question).slice(0, 60)}-${i.toString(36)}${rand(100, 999)}`,
      creatorId: creator.id,
      categoryId: category.id,
      type: postType,
      question,
      isAnonymous: Math.random() < 0.08,
      allowComments: true,
      status: PostStatus.PUBLISHED,
      isClosed: false,
      closeVotingAt: closeAt,
      isFeatured: isTrending && Math.random() < 0.4,
      trendingScore: isTrending ? rand(500, 10_000) : rand(0, 80),
      viralityScore: isTrending ? rand(300, 5000) : rand(0, 50),
      controversyScore:
        isTrending && Math.random() < 0.5 ? rand(100, 900) : rand(0, 60),
      createdAt,
      updatedAt: createdAt,
    });
  }

  const createdPosts = await Promise.all(
    postDefs.map(async (def) => {
      const options = optionsFor(def.type, def.question);
      return prisma.post.create({
        data: {
          ...def,
          options: { create: options },
        },
        select: {
          id: true,
          slug: true,
          type: true,
          question: true,
          options: { select: { id: true, value: true, label: true, sortOrder: true } },
        },
      });
    })
  );
  console.log(`✅ Created ${createdPosts.length} posts with options`);

  console.log("🗳️ Generating votes (10-500 votes per post, no duplicates)...");
  const voteBulkData: any[] = [];
  const optionVoteCounts: Record<string, number> = {};
  const postVoteCounts: Record<string, number> = {};

  for (const post of createdPosts) {
    const nVotes = rand(10, 500);
    const voters = pickMany(allUsers, Math.min(nVotes, allUsers.length));
    const opts = [...post.options].sort((a, b) => a.sortOrder - b.sortOrder);

    let distribution: number[] = [];
    if (post.type === PostType.RATING) {
      const peak = rand(5, 8);
      distribution = Array.from({ length: 10 }, (_, i) => {
        const dist = Math.abs(i + 1 - peak);
        return Math.max(1, Math.round(nVotes / (2 + dist * 1.2)));
      });
    } else if (post.type === PostType.YES_NO || post.type === PostType.DECISION || post.type === PostType.PREDICTION) {
      const p = pick([0.5, 0.52, 0.6, 0.7, 0.8, 0.48, 0.45]);
      const yes = Math.max(1, Math.round(nVotes * p));
      distribution = [yes, Math.max(1, nVotes - yes)];
    } else if (post.type === PostType.A_VS_B) {
      const ra = pick([0.45, 0.5, 0.55, 0.6, 0.7, 0.3]);
      const a = Math.max(1, Math.round(nVotes * ra));
      distribution = [a, Math.max(1, nVotes - a)];
    } else {
      const weights = opts.map(() => Math.random() + 0.3);
      const sumW = weights.reduce((s, x) => s + x, 0);
      distribution = weights.map((w) => Math.max(1, Math.round((w / sumW) * nVotes)));
    }

    const pool: string[] = [];
    opts.forEach((opt, idx) => {
      const count = Math.min(distribution[idx] ?? 1, Math.max(1, nVotes));
      for (let k = 0; k < count; k++) pool.push(opt.id);
    });
    while (pool.length < voters.length && opts.length > 0) {
      pool.push(pick(opts).id);
    }

    const finalVoters = voters.slice(0, pool.length);
    postVoteCounts[post.id] = finalVoters.length;

    for (let k = 0; k < finalVoters.length; k++) {
      const user = finalVoters[k];
      const optionId = pool[k];
      if (!user || !optionId) continue;
      optionVoteCounts[optionId] = (optionVoteCounts[optionId] ?? 0) + 1;

      const extra: any = {};
      if (post.type === PostType.RATING) {
        const opt = opts.find((o) => o.id === optionId);
        extra.ratingValue = opt ? parseInt(opt.value, 10) : rand(1, 10);
      } else if (post.type === PostType.EMOJI) {
        const opt = opts.find((o) => o.id === optionId);
        extra.emojiValue = opt ? opt.value : pick(EMOJI_REACTIONS);
      }

      voteBulkData.push({
        postId: post.id,
        userId: user.id,
        optionId,
        ...extra,
        createdAt: new Date(Date.now() - rand(0, 20) * 86400_000),
      });
    }
  }

  // Insert votes in chunks (500 / chunk) to avoid exhausting Neon Free connection pool
  // (neon 1CU has connection limit ≈ 20, Promise.all of 10k starves the pool).
  const VOTE_BATCH = 500;
  const chunks = chunkArray(voteBulkData, VOTE_BATCH);
  let inserted = 0;
  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i];
    if (!c) continue;
    await prisma.vote.createMany({ data: c, skipDuplicates: true });
    inserted += c.length;
    if (i !== chunks.length - 1) await sleep(300);
  }
  console.log(`✅ Inserted ${inserted} votes in ${chunks.length} batches (${VOTE_BATCH}/batch)`);

  console.log("🔢 Updating vote counters on Post + PostOption...");
  const counterUpdates: Promise<any>[] = [];
  for (const post of createdPosts) {
    counterUpdates.push(
      prisma.post.update({
        where: { id: post.id },
        data: { voteCount: postVoteCounts[post.id] ?? 0 },
      })
    );
    for (const opt of post.options) {
      counterUpdates.push(
        prisma.postOption.update({
          where: { id: opt.id },
          data: { voteCount: optionVoteCounts[opt.id] ?? 0 },
        })
      );
    }
  }
  await runChunked("Post+Option vote counters", () => counterUpdates, { chunkSize: 150, sleepMs: 150 });
  console.log("✅ Counters updated");

  console.log("💭 Creating comments (0-30 per post)...");
  const commentCreates: Promise<any>[] = [];
  const commentList: any[] = [];
  for (const post of createdPosts) {
    const nComments = rand(0, 30);
    const commenters = pickMany(allUsers, nComments);
    let pCommentCount = 0;
    for (let k = 0; k < commenters.length; k++) {
      const commenter = commenters[k];
      if (!commenter) continue;
      const text = pick(COMMENT_TEMPLATES);
      commentCreates.push(
        prisma.comment
          .create({
            data: {
              postId: post.id,
              creatorId: commenter.id,
              text,
              createdAt: new Date(Date.now() - rand(0, 20) * 86400_000),
            },
            select: { id: true },
          })
          .then((c) => {
            commentList.push({ id: c.id, postId: post.id });
          })
      );
      pCommentCount++;
    }
    if (pCommentCount > 0) {
      commentCreates.push(
        prisma.post.update({
          where: { id: post.id },
          data: { commentCount: pCommentCount },
        })
      );
    }
  }
  await runChunked("Comments + per-post comment counters", () => commentCreates, { chunkSize: 150, sleepMs: 200 });
  console.log(`✅ Created comments (commentList.length = ${commentList.length})`);

  console.log("❤️ Adding comment likes (random subset)...");
  const commentLikes: Promise<any>[] = [];
  for (const { id: commentId } of commentList) {
    if (Math.random() < 0.35) {
      const nLikes = rand(1, 15);
      const likers = pickMany(allUsers, nLikes);
      for (const u of likers) {
        commentLikes.push(
          prisma.commentLike.create({
            data: { commentId, userId: u.id },
          })
        );
      }
      commentLikes.push(
        prisma.comment.update({
          where: { id: commentId },
          data: { likeCount: nLikes },
        })
      );
    }
  }
  await runChunked("Comment likes + per-comment counters", () => commentLikes, { chunkSize: 100, sleepMs: 150 });
  console.log(`✅ Added ${commentLikes.length} comment-like ops`);

  console.log("👥 Building social follow graph (10-40% rate)...");
  const followEdges = new Set<string>();
  const followCreates: Promise<any>[] = [];
  const followerCounts: Record<string, number> = {};
  const followingCounts: Record<string, number> = {};
  for (const a of allUsers) {
    for (const b of allUsers) {
      if (a.id === b.id) continue;
      const p = Math.random();
      if (p >= 0.1 && p <= 0.4) {
        const key = `${a.id}|${b.id}`;
        if (followEdges.has(key)) continue;
        followEdges.add(key);
        followCreates.push(
          prisma.follow.create({
            data: { followerId: a.id, followingId: b.id },
          })
        );
        followingCounts[a.id] = (followingCounts[a.id] ?? 0) + 1;
        followerCounts[b.id] = (followerCounts[b.id] ?? 0) + 1;
      }
    }
  }
  await runChunked("Follow edges", () => followCreates, { chunkSize: 200, sleepMs: 300 });
  console.log(`✅ Created ${followCreates.length} follow edges`);

  console.log("📌 Adding Likes & SavedPosts (10% posts × 20 users)...");
  const likeCreates: Promise<any>[] = [];
  const saveCreates: Promise<any>[] = [];
  const postLikeCounts: Record<string, number> = {};
  const postSaveCounts: Record<string, number> = {};
  const userSubset = pickMany(allUsers, 20);
  for (const u of userSubset) {
    const postsToInteract = pickMany(createdPosts, Math.max(1, Math.round(createdPosts.length * 0.1)));
    for (const post of postsToInteract) {
      likeCreates.push(
        prisma.like.create({
          data: { postId: post.id, userId: u.id },
        })
      );
      postLikeCounts[post.id] = (postLikeCounts[post.id] ?? 0) + 1;
      if (Math.random() < 0.5) {
        saveCreates.push(
          prisma.savedPost.create({
            data: { postId: post.id, userId: u.id },
          })
        );
        postSaveCounts[post.id] = (postSaveCounts[post.id] ?? 0) + 1;
      }
    }
  }
  await runChunked("Likes + SavedPosts inserts", () => [...likeCreates, ...saveCreates], { chunkSize: 250, sleepMs: 200 });
  const counterUpdates2: Promise<any>[] = [];
  for (const post of createdPosts) {
    counterUpdates2.push(
      prisma.post.update({
        where: { id: post.id },
        data: {
          likeCount: postLikeCounts[post.id] ?? 0,
          saveCount: postSaveCounts[post.id] ?? 0,
          viewCount: rand(20, 20_000),
          shareCount: rand(0, 500),
        },
      })
    );
  }
  await runChunked("Post like/save/view/share counters", () => counterUpdates2, { chunkSize: 100, sleepMs: 150 });
  console.log(`✅ Likes: ${likeCreates.length}, Saves: ${saveCreates.length}`);

  console.log("🚩 Creating 12 reports (OPEN / UNDER_REVIEW)...");
  const reportReasons = [
    ReportReason.SPAM,
    ReportReason.HARASSMENT,
    ReportReason.HATE,
    ReportReason.NUDITY,
    ReportReason.COPYRIGHT,
    ReportReason.OTHER,
    ReportReason.VIOLENCE,
    ReportReason.SCAM,
  ];
  const mods = allUsers.filter((u) => u.role === Role.MODERATOR || u.role === Role.ADMIN);
  const reports: Promise<any>[] = [];
  for (let i = 0; i < 12; i++) {
    const reporter = pick(allUsers);
    const status = i < 7 ? ReportStatus.OPEN : ReportStatus.UNDER_REVIEW;
    const assigned = status === ReportStatus.UNDER_REVIEW ? pick(mods).id : null;
    const typeRoll = Math.random();
    if (typeRoll < 0.6) {
      const post = pick(createdPosts);
      reports.push(
        prisma.report.create({
          data: {
            type: ReportType.POST,
            reporterId: reporter.id,
            reportedPostId: post.id,
            reason: pick(reportReasons),
            details: "Reported by user during development seed.",
            status,
            assignedModeratorId: assigned,
          },
        })
      );
    } else if (typeRoll < 0.85 && commentList.length > 0) {
      const comment = pick(commentList);
      reports.push(
        prisma.report.create({
          data: {
            type: ReportType.COMMENT,
            reporterId: reporter.id,
            reportedCommentId: comment.id,
            reason: pick(reportReasons),
            details: "Comment reported via seed script.",
            status,
            assignedModeratorId: assigned,
          },
        })
      );
    } else {
      let target = pick(allUsers);
      while (target.id === reporter.id) target = pick(allUsers);
      reports.push(
        prisma.report.create({
          data: {
            type: ReportType.USER,
            reporterId: reporter.id,
            reportedUserId: target.id,
            reason: pick(reportReasons),
            details: "User reported in seed script.",
            status,
            assignedModeratorId: assigned,
          },
        })
      );
    }
  }
  await runChunked("Reports", () => reports, { chunkSize: 50, sleepMs: 200 });
  console.log("✅ Created 12 reports");

  console.log("🔮 Resolving 2 predictions (marking correct option)...");
  const predictionPosts = createdPosts.filter((p) => p.type === PostType.PREDICTION);
  const predictionsToResolve = predictionPosts.slice(0, 2);
  for (const post of predictionsToResolve) {
    const opts = [...post.options].sort((a, b) => a.sortOrder - b.sortOrder);
    const correctOption = pick(opts);
    const prediction = await prisma.prediction.create({
      data: {
        postId: post.id,
        correctOptionId: correctOption.id,
        isResolved: true,
        resolvedBy: adminUser.id,
        resolvedAt: new Date(),
        resolutionDate: new Date(),
      },
      select: { id: true },
    });
    const voters = await prisma.vote.findMany({
      where: { postId: post.id },
      select: { userId: true, optionId: true },
    });
    const resultCreates: Promise<any>[] = [];
    const scoreUpdates: Promise<any>[] = [];
    for (const v of voters) {
      const isCorrect = v.optionId === correctOption.id;
      resultCreates.push(
        prisma.predictionResult.create({
          data: {
            predictionId: prediction.id,
            userId: v.userId,
            votedOptionId: v.optionId!,
            isCorrect,
            awardedScore: isCorrect ? rand(5, 50) : 0,
            processed: true,
          },
        })
      );
      if (isCorrect) {
        scoreUpdates.push(
          prisma.user.update({
            where: { id: v.userId },
            data: {
              predictionsMade: { increment: 1 },
              predictionsCorrect: { increment: 1 },
            },
          })
        );
      } else {
        scoreUpdates.push(
          prisma.user.update({
            where: { id: v.userId },
            data: { predictionsMade: { increment: 1 } },
          })
        );
      }
    }
    await runChunked(
      `Prediction ${predictionsToResolve.indexOf(post) + 1} results + user score updates`,
      () => [...resultCreates, ...scoreUpdates],
      { chunkSize: 200, sleepMs: 250 }
    );
    await prisma.post.update({
      where: { id: post.id },
      data: {
        isClosed: true,
        predictionResolvedAt: new Date(),
        predictionCorrect: correctOption.value === "yes",
        predictedOutcome: correctOption.label,
      },
    });
  }
  console.log("✅ Resolved 2 predictions with PredictionResults");

  console.log("🎯 Seeding user category interests for a subset of users...");
  const interestCreates: Promise<any>[] = [];
  for (const u of pickMany(allUsers, 30)) {
    const cats = pickMany(allCategories, rand(2, 6));
    for (const cat of cats) {
      interestCreates.push(
        prisma.userCategoryInterest.create({
          data: {
            userId: u.id,
            categoryId: cat.id,
            weight: Math.random() * 4 + 0.5,
            viewCount: rand(0, 500),
            voteCount: rand(0, 200),
          },
        })
      );
    }
  }
  await runChunked("User category interests", () => interestCreates, { chunkSize: 200, sleepMs: 200 });
  console.log(`✅ Created ${interestCreates.length} category interests`);

  console.log("\n🌱 Seed completed successfully!");
  console.log(`   Users: ${allUsers.length}`);
  console.log(`   Categories: ${allCategories.length}`);
  console.log(`   Posts: ${createdPosts.length}`);
  console.log(`   Votes: ${voteBulkData.length}`);
  console.log(`   Follows: ${followCreates.length}`);
  console.log(`   Admin: ${adminUser.email} / admin1234`);
  console.log(`   All seeded users: whatdo1234`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
