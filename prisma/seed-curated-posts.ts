import { PrismaClient, PostType, PostStatus, User, Category } from "@prisma/client";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const DOTENV_LOCAL = resolve(process.cwd(), ".env.local");
try {
  const content = readFileSync(DOTENV_LOCAL, "utf-8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
} catch {
  // File not found / read error is okay — rely on existing env
}

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Please copy `.env.example` to `.env.local` and fill Neon credentials."
  );
}

const prisma = new PrismaClient();

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] ?? arr[0];
}

function pickMany<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  const result: T[] = [];
  for (let i = 0; i < n && copy.length > 0; i++) {
    const idx = Math.floor(Math.random() * copy.length);
    const item = copy[idx];
    if (item !== undefined) {
      result.push(item);
      copy.splice(idx, 1);
    }
  }
  return result;
}

const EMOJI_REACTIONS = ["🔥", "😍", "😐", "👍", "👎", "🤩", "🤔", "🎉"];

type OptionDef = { label: string; value: string; sortOrder: number };

type PostSeedDef = {
  question: string;
  category: string; // slug
  type: PostType;
  options: OptionDef[];
  tags?: string[];
  daysAgoMin?: number;
  daysAgoMax?: number;
  featured?: boolean;
  nVotesMin?: number;
  nVotesMax?: number;
};

const POSTS: PostSeedDef[] = [
  // =========================================================================
  // 🔥 GENERAL (User's "First 20" + Everyday People examples)
  // =========================================================================
  {
    question: "Would you rather have ₹1 crore today or ₹10 lakh every year for 20 years?",
    category: "lifestyle",
    type: PostType.A_VS_B,
    options: [
      { label: "₹1 crore today", value: "crore-today", sortOrder: 0 },
      { label: "₹10 lakh/year × 20 yr", value: "10-lakh-yearly", sortOrder: 1 },
    ],
    tags: ["money", "lifestyle", "choice"],
    nVotesMin: 80,
    nVotesMax: 420,
    featured: true,
  },
  {
    question: "Is working from home better than working from office?",
    category: "career",
    type: PostType.YES_NO,
    options: [
      { label: "Yes — WFH wins", value: "yes", sortOrder: 0 },
      { label: "No — Office is better", value: "no", sortOrder: 1 },
    ],
    tags: ["workfromhome", "wfh", "career"],
    nVotesMin: 200,
    nVotesMax: 900,
    featured: true,
  },
  {
    question: "What's more important: Money or Work-Life Balance?",
    category: "lifestyle",
    type: PostType.A_VS_B,
    options: [
      { label: "Money", value: "money", sortOrder: 0 },
      { label: "Work-Life Balance", value: "work-life", sortOrder: 1 },
    ],
    tags: ["career", "lifestyle", "choice"],
    nVotesMin: 100,
    nVotesMax: 500,
  },
  {
    question: "Would you move to another city for a 30% salary increase?",
    category: "career",
    type: PostType.YES_NO,
    options: [
      { label: "Yes, I'd move", value: "yes", sortOrder: 0 },
      { label: "No, I'd stay", value: "no", sortOrder: 1 },
    ],
    tags: ["career", "money", "relocation"],
    nVotesMin: 60,
    nVotesMax: 300,
  },
  {
    question: "Is AI making life better overall?",
    category: "ai",
    type: PostType.YES_NO,
    options: [
      { label: "Yes — better overall", value: "yes", sortOrder: 0 },
      { label: "No — too risky", value: "no", sortOrder: 1 },
    ],
    tags: ["ai", "future", "opinion"],
    nVotesMin: 120,
    nVotesMax: 600,
    featured: true,
  },

  // =========================================================================
  // 📱 TECHNOLOGY
  // =========================================================================
  {
    question: "iPhone or Android — which ecosystem is better in 2026?",
    category: "technology",
    type: PostType.A_VS_B,
    options: [
      { label: "📱 iPhone", value: "iphone", sortOrder: 0 },
      { label: "🤖 Android", value: "android", sortOrder: 1 },
    ],
    tags: ["apple", "android", "smartphone"],
    nVotesMin: 300,
    nVotesMax: 1200,
    featured: true,
  },
  {
    question: "Which AI tool do you use most in your daily life?",
    category: "ai",
    type: PostType.MULTIPLE_CHOICE,
    options: [
      { label: "ChatGPT", value: "chatgpt", sortOrder: 0 },
      { label: "Gemini", value: "gemini", sortOrder: 1 },
      { label: "Claude", value: "claude", sortOrder: 2 },
      { label: "Perplexity", value: "perplexity", sortOrder: 3 },
    ],
    tags: ["ai", "tools", "llm"],
    nVotesMin: 150,
    nVotesMax: 700,
  },
  {
    question: "Would you pay ₹2,000/month for a really capable AI assistant?",
    category: "ai",
    type: PostType.YES_NO,
    options: [
      { label: "Yes — worth it", value: "yes", sortOrder: 0 },
      { label: "No — too expensive", value: "no", sortOrder: 1 },
    ],
    tags: ["ai", "subscription", "budget"],
    nVotesMin: 80,
    nVotesMax: 350,
  },
  {
    question: "I'm choosing my next phone. Which one should I buy?",
    category: "technology",
    type: PostType.MULTIPLE_CHOICE,
    options: [
      { label: "📱 iPhone", value: "iphone", sortOrder: 0 },
      { label: "📱 Samsung", value: "samsung", sortOrder: 1 },
      { label: "📱 Pixel", value: "pixel", sortOrder: 2 },
      { label: "📱 OnePlus", value: "oneplus", sortOrder: 3 },
    ],
    tags: ["smartphone", "tech", "buy", "influencer-example"],
    nVotesMin: 500,
    nVotesMax: 1500,
    featured: true,
  },
  {
    question: "Is a laptop still necessary in 2026?",
    category: "technology",
    type: PostType.YES_NO,
    options: [
      { label: "Yes — still need it", value: "yes", sortOrder: 0 },
      { label: "No — phone + tablet is enough", value: "no", sortOrder: 1 },
    ],
    tags: ["tech", "lifestyle", "gadgets"],
    nVotesMin: 100,
    nVotesMax: 450,
  },

  // =========================================================================
  // 🍔 LIFESTYLE / FOOD / TRAVEL
  // =========================================================================
  {
    question: "Pizza or Burger — which do you pick?",
    category: "food",
    type: PostType.A_VS_B,
    options: [
      { label: "🍕 Pizza", value: "pizza", sortOrder: 0 },
      { label: "🍔 Burger", value: "burger", sortOrder: 1 },
    ],
    tags: ["food", "lifestyle"],
    nVotesMin: 300,
    nVotesMax: 1200,
  },
  {
    question: "Tea or Coffee — which one are you drinking right now?",
    category: "lifestyle",
    type: PostType.A_VS_B,
    options: [
      { label: "🍵 Tea", value: "tea", sortOrder: 0 },
      { label: "☕ Coffee", value: "coffee", sortOrder: 1 },
    ],
    tags: ["lifestyle", "choice"],
    nVotesMin: 250,
    nVotesMax: 1000,
  },
  {
    question: "Mountains or Beach — dream vacation?",
    category: "travel",
    type: PostType.A_VS_B,
    options: [
      { label: "🏔️ Mountains", value: "mountains", sortOrder: 0 },
      { label: "🏖️ Beach", value: "beach", sortOrder: 1 },
    ],
    tags: ["travel", "lifestyle", "choice"],
    nVotesMin: 300,
    nVotesMax: 1100,
  },
  {
    question: "Morning person or Night owl?",
    category: "lifestyle",
    type: PostType.A_VS_B,
    options: [
      { label: "🌅 Morning person", value: "morning", sortOrder: 0 },
      { label: "🦉 Night owl", value: "night-owl", sortOrder: 1 },
    ],
    tags: ["lifestyle", "choice"],
    nVotesMin: 200,
    nVotesMax: 800,
  },
  {
    question: "Would you rather travel every month for a year or buy a new car?",
    category: "lifestyle",
    type: PostType.A_VS_B,
    options: [
      { label: "✈️ Travel every month", value: "travel", sortOrder: 0 },
      { label: "🚗 Buy a new car", value: "car", sortOrder: 1 },
    ],
    tags: ["lifestyle", "money", "choice"],
    nVotesMin: 80,
    nVotesMax: 300,
  },

  // =========================================================================
  // 👨‍💼 CAREER (User's "First 20")
  // =========================================================================
  {
    question: "Job or Business — which path is better long term?",
    category: "career",
    type: PostType.A_VS_B,
    options: [
      { label: "💼 Job", value: "job", sortOrder: 0 },
      { label: "🚀 Business", value: "business", sortOrder: 1 },
    ],
    tags: ["career", "money", "growth"],
    nVotesMin: 250,
    nVotesMax: 900,
    featured: true,
  },
  {
    question: "Remote or Office — which work model is actually more productive?",
    category: "career",
    type: PostType.A_VS_B,
    options: [
      { label: "🏡 Remote", value: "remote", sortOrder: 0 },
      { label: "🏢 Office", value: "office", sortOrder: 1 },
    ],
    tags: ["career", "wfh", "work"],
    nVotesMin: 200,
    nVotesMax: 800,
  },
  {
    question: "Would you accept a 20% salary cut for a 4-day work week?",
    category: "career",
    type: PostType.YES_NO,
    options: [
      { label: "Yes — sign me up", value: "yes", sortOrder: 0 },
      { label: "No — I need the money", value: "no", sortOrder: 1 },
    ],
    tags: ["career", "4daywork", "worklife"],
    nVotesMin: 300,
    nVotesMax: 1200,
    featured: true,
  },
  {
    question: "Is a degree still necessary for a successful career?",
    category: "education",
    type: PostType.YES_NO,
    options: [
      { label: "Yes — degree matters", value: "yes", sortOrder: 0 },
      { label: "No — skills matter more", value: "no", sortOrder: 1 },
    ],
    tags: ["education", "career", "opinion"],
    nVotesMin: 200,
    nVotesMax: 800,
  },
  {
    question: "Would you switch careers after 10 years in the same field?",
    category: "career",
    type: PostType.YES_NO,
    options: [
      { label: "Yes — reinvent", value: "yes", sortOrder: 0 },
      { label: "No — stick with it", value: "no", sortOrder: 1 },
    ],
    tags: ["career", "growth", "change"],
    nVotesMin: 80,
    nVotesMax: 350,
  },

  // =========================================================================
  // ⭐ INFLUENCER / CREATOR EXAMPLES (from user's use-case doc)
  // =========================================================================
  {
    question: "What video should I make next? Vote — I'll make the winning one!",
    category: "technology",
    type: PostType.MULTIPLE_CHOICE,
    options: [
      { label: "A — iPhone 17 review", value: "iphone-review", sortOrder: 0 },
      { label: "B — Best Android phones", value: "best-android", sortOrder: 1 },
      { label: "C — AI tools you must try", value: "ai-tools", sortOrder: 2 },
      { label: "D — MacBook comparison", value: "macbook-compare", sortOrder: 3 },
    ],
    tags: ["creator", "youtube", "tech", "votedecides", "influencer-example"],
    nVotesMin: 1200,
    nVotesMax: 5000,
    featured: true,
    daysAgoMin: 2,
    daysAgoMax: 7,
  },
  {
    question: "Which outfit should I wear for tonight's event?",
    category: "fashion",
    type: PostType.A_VS_B,
    options: [
      { label: "A — All Black", value: "outfit-a-black", sortOrder: 0 },
      { label: "B — Navy Blue", value: "outfit-b-blue", sortOrder: 1 },
    ],
    tags: ["fashion", "creator", "influencer-example"],
    nVotesMin: 800,
    nVotesMax: 3000,
    featured: true,
  },
  {
    question: "Which restaurant should I review next?",
    category: "food",
    type: PostType.MULTIPLE_CHOICE,
    options: [
      { label: "A — Bombay Brasserie", value: "bombay-brasserie", sortOrder: 0 },
      { label: "B — Smoke House Deli", value: "smoke-house-deli", sortOrder: 1 },
      { label: "C — SodaBottleOpenerWala", value: "sbop", sortOrder: 2 },
      { label: "D — The Table", value: "the-table", sortOrder: 3 },
    ],
    tags: ["food", "creator", "restaurant", "influencer-example"],
    nVotesMin: 400,
    nVotesMax: 1400,
  },
  {
    question: "Which laptop should I test and review next?",
    category: "technology",
    type: PostType.MULTIPLE_CHOICE,
    options: [
      { label: "A — MacBook Pro M5", value: "macbook", sortOrder: 0 },
      { label: "B — Dell XPS 15", value: "dell-xps", sortOrder: 1 },
      { label: "C — Lenovo ThinkPad X1", value: "thinkpad", sortOrder: 2 },
      { label: "D — ASUS Zephyrus G14", value: "zephyrus", sortOrder: 3 },
    ],
    tags: ["tech", "creator", "laptop", "influencer-example"],
    nVotesMin: 500,
    nVotesMax: 2000,
  },
  {
    question: "Which financial topic should I explain next on my channel?",
    category: "money",
    type: PostType.MULTIPLE_CHOICE,
    options: [
      { label: "A — Mutual Funds 101", value: "mutual-funds", sortOrder: 0 },
      { label: "B — Tax Planning for salaried", value: "tax-planning", sortOrder: 1 },
      { label: "C — Credit cards & rewards", value: "credit-cards", sortOrder: 2 },
      { label: "D — Home loans: new vs balance transfer", value: "home-loans", sortOrder: 3 },
    ],
    tags: ["money", "finance", "creator", "influencer-example"],
    nVotesMin: 300,
    nVotesMax: 1500,
  },
  {
    question: "I'm a startup founder building a product — should I LAUNCH this feature? Let your vote decide!",
    category: "startups",
    type: PostType.DECISION,
    options: [
      { label: "✅ YES — launch it", value: "yes", sortOrder: 0 },
      { label: "⛔ NO — wait / rebuild", value: "no", sortOrder: 1 },
      { label: "🤔 Not sure — need more details", value: "unsure", sortOrder: 2 },
    ],
    tags: ["startups", "founder", "feedback", "influencer-example"],
    nVotesMin: 600,
    nVotesMax: 2400,
    featured: true,
  },

  // =========================================================================
  // 🏢 BUSINESS / CUSTOMER-FEEDBACK EXAMPLES
  // =========================================================================
  {
    question: "We're adding a NEW dish to the menu — which one should it be?",
    category: "food",
    type: PostType.MULTIPLE_CHOICE,
    options: [
      { label: "🍕 Wood-fired Pizza", value: "pizza", sortOrder: 0 },
      { label: "🍔 Smash Burger", value: "burger", sortOrder: 1 },
      { label: "🌮 Mexican Tacos", value: "tacos", sortOrder: 2 },
      { label: "🍝 Creamy Pasta", value: "pasta", sortOrder: 3 },
    ],
    tags: ["restaurant", "food", "business", "feedback"],
    nVotesMin: 150,
    nVotesMax: 700,
  },
  {
    question: "Which design should become our NEXT T-shirt drop?",
    category: "fashion",
    type: PostType.MULTIPLE_CHOICE,
    options: [
      { label: "A — Minimalist Logo", value: "design-a-minimal", sortOrder: 0 },
      { label: "B — Streetwear Graphic", value: "design-b-graphic", sortOrder: 1 },
      { label: "C — Typography Quote", value: "design-c-quote", sortOrder: 2 },
    ],
    tags: ["fashion", "business", "merch", "design"],
    nVotesMin: 200,
    nVotesMax: 900,
  },
  {
    question: "Which feature should we build NEXT? Vote directly on our roadmap!",
    category: "startups",
    type: PostType.MULTIPLE_CHOICE,
    options: [
      { label: "A — Dark mode", value: "dark-mode", sortOrder: 0 },
      { label: "B — Mobile app", value: "mobile-app", sortOrder: 1 },
      { label: "C — AI assistant", value: "ai-assistant", sortOrder: 2 },
      { label: "D — Smart notifications", value: "notifications", sortOrder: 3 },
    ],
    tags: ["startups", "product", "roadmap", "business", "feedback"],
    nVotesMin: 500,
    nVotesMax: 2000,
    featured: true,
  },

  // =========================================================================
  // 💭 "WHAT SHOULD I DO?" — Signature WHATDO questions
  // =========================================================================
  {
    question: "Should I quit my 9–5 and start this business full time?",
    category: "startups",
    type: PostType.DECISION,
    options: [
      { label: "✅ YES — go for it", value: "yes", sortOrder: 0 },
      { label: "⛔ NO — safer to wait", value: "no", sortOrder: 1 },
      { label: "🤔 Not sure — side-hustle first", value: "side-hustle", sortOrder: 2 },
    ],
    tags: ["startup", "career", "whatshouldido"],
    nVotesMin: 400,
    nVotesMax: 1800,
    featured: true,
  },
  {
    question: "Should I buy this car now or wait another 6 months?",
    category: "cars",
    type: PostType.DECISION,
    options: [
      { label: "🚗 Buy NOW", value: "buy-now", sortOrder: 0 },
      { label: "⏳ Wait 6 months", value: "wait", sortOrder: 1 },
      { label: "🤔 Not sure yet", value: "not-sure", sortOrder: 2 },
    ],
    tags: ["cars", "money", "whatshouldido"],
    nVotesMin: 100,
    nVotesMax: 500,
  },
  {
    question: "I got a 30% hike + Bangalore relocation. Should I move?",
    category: "career",
    type: PostType.YES_NO,
    options: [
      { label: "Yes — take it", value: "yes", sortOrder: 0 },
      { label: "No — stay home", value: "no", sortOrder: 1 },
    ],
    tags: ["career", "bangalore", "relocation", "whatshouldido"],
    nVotesMin: 200,
    nVotesMax: 800,
  },
  {
    question: "Should I propose to my partner this Diwali? 😂",
    category: "relationships",
    type: PostType.YES_NO,
    options: [
      { label: "💍 YES — do it!", value: "yes", sortOrder: 0 },
      { label: "⏸️ Wait a bit longer", value: "no", sortOrder: 1 },
    ],
    tags: ["relationship", "life", "whatshouldido", "funny"],
    nVotesMin: 300,
    nVotesMax: 1500,
    featured: true,
  },
  {
    question: "Should I take that solo trip to Goa next month?",
    category: "travel",
    type: PostType.YES_NO,
    options: [
      { label: "✈️ YES — pack your bags", value: "yes", sortOrder: 0 },
      { label: "❌ NO — next time", value: "no", sortOrder: 1 },
    ],
    tags: ["travel", "whatshouldido", "goa"],
    nVotesMin: 120,
    nVotesMax: 600,
  },

  // =========================================================================
  // 🛠️ OTHER OPINION TYPES (cover all 9 WHATDO types)
  // =========================================================================
  {
    question: "Rate my new startup logo — be honest! (1 = worst, 10 = perfect)",
    category: "design",
    type: PostType.RATING,
    options: Array.from({ length: 10 }, (_, i) => ({
      label: String(i + 1),
      value: String(i + 1),
      sortOrder: i,
    })),
    tags: ["design", "logo", "rating", "feedback"],
    nVotesMin: 80,
    nVotesMax: 400,
  },
  {
    question: "Just finished my website redesign. First thoughts? 👇",
    category: "design",
    type: PostType.EMOJI,
    options: EMOJI_REACTIONS.slice(0, 6).map((e, i) => ({
      label: e,
      value: e,
      sortOrder: i,
    })),
    tags: ["design", "feedback", "emoji", "website"],
    nVotesMin: 60,
    nVotesMax: 300,
  },
  {
    question: "Which topic should I cover next on my newsletter?",
    category: "business",
    type: PostType.POLL,
    options: [
      { label: "🏔️ Deep-dive on startup bootstrapping", value: "bootstrap", sortOrder: 0 },
      { label: "💰 SaaS pricing strategies", value: "pricing", sortOrder: 1 },
      { label: "📈 Growth experiments that actually worked", value: "growth", sortOrder: 2 },
      { label: "🎙️ Founder interview: lessons learned", value: "interview", sortOrder: 3 },
      { label: "📊 Building in public — dos and don'ts", value: "buildinpublic", sortOrder: 4 },
    ],
    tags: ["business", "newsletter", "creator", "classic-poll"],
    nVotesMin: 100,
    nVotesMax: 500,
  },
  {
    question: "Guess the price of this watch! ⌚ Closest answer wins a shout-out 🏆",
    category: "shopping",
    type: PostType.PRICE,
    options: [
      { label: "₹4,999", value: "4999", sortOrder: 0 },
      { label: "₹9,999", value: "9999", sortOrder: 1 },
      { label: "₹19,999", value: "19999", sortOrder: 2 },
      { label: "₹39,999", value: "39999", sortOrder: 3 },
      { label: "₹79,999", value: "79999", sortOrder: 4 },
      { label: "₹1,50,000+", value: "150000", sortOrder: 5 },
    ],
    tags: ["shopping", "guess", "price", "watches"],
    nVotesMin: 150,
    nVotesMax: 700,
  },
  {
    question: "Will India win the 2027 Cricket World Cup?",
    category: "sports",
    type: PostType.PREDICTION,
    options: [
      { label: "🏆 YES — India will win", value: "yes", sortOrder: 0 },
      { label: "❌ NO — another team", value: "no", sortOrder: 1 },
    ],
    tags: ["sports", "cricket", "prediction", "worldcup"],
    nVotesMin: 500,
    nVotesMax: 2500,
    featured: true,
  },
  {
    question: "Goa or Bali for my next trip?",
    category: "travel",
    type: PostType.A_VS_B,
    options: [
      { label: "🏖️ Goa", value: "goa", sortOrder: 0 },
      { label: "🌴 Bali", value: "bali", sortOrder: 1 },
    ],
    tags: ["travel", "choice", "vacation"],
    nVotesMin: 150,
    nVotesMax: 600,
  },
  {
    question: "Is ₹2,000 a good price for this wireless earbud? (A little bird told me it's a solid product)",
    category: "shopping",
    type: PostType.YES_NO,
    options: [
      { label: "👍 Yes — good price", value: "yes", sortOrder: 0 },
      { label: "👎 No — wait for sale", value: "no", sortOrder: 1 },
    ],
    tags: ["shopping", "price", "gadgets"],
    nVotesMin: 80,
    nVotesMax: 400,
  },
  {
    question: "Which pizza should I order tonight? Help me decide!",
    category: "food",
    type: PostType.MULTIPLE_CHOICE,
    options: [
      { label: "🍕 Margherita", value: "margherita", sortOrder: 0 },
      { label: "🍕 Farmhouse", value: "farmhouse", sortOrder: 1 },
      { label: "🍕 Paneer Tikka", value: "paneer-tikka", sortOrder: 2 },
      { label: "🍕 Pepperoni", value: "pepperoni", sortOrder: 3 },
    ],
    tags: ["food", "pizza", "choice"],
    nVotesMin: 100,
    nVotesMax: 500,
  },
  {
    question: "Should we ban e-scooters on Indian footpaths? (Safety first or mobility first?)",
    category: "technology",
    type: PostType.YES_NO,
    options: [
      { label: "Yes — ban on footpaths", value: "yes", sortOrder: 0 },
      { label: "No — bike lanes needed first", value: "no", sortOrder: 1 },
    ],
    tags: ["tech", "escooter", "mobility", "safety"],
    nVotesMin: 200,
    nVotesMax: 800,
  },
];

function randomDistribution(opts: OptionDef[], nVotes: number, type: PostType): number[] {
  if (type === PostType.RATING) {
    const peak = rand(6, 8);
    return Array.from({ length: opts.length }, (_, i) => {
      const dist = Math.abs(i + 1 - peak);
      return Math.max(1, Math.round(nVotes / (2 + dist * 1.3)));
    });
  }
  if (
    type === PostType.YES_NO ||
    type === PostType.DECISION ||
    type === PostType.PREDICTION ||
    type === PostType.A_VS_B
  ) {
    const probs = [0.42, 0.48, 0.5, 0.55, 0.6, 0.68, 0.72];
    const p = probs[rand(0, probs.length - 1)] ?? 0.5;
    const first = Math.max(1, Math.round(nVotes * p));
    const result: number[] = [first, Math.max(1, nVotes - first)];
    while (result.length < opts.length) {
      const remaining = result.reduce((s, x) => s + x, 0);
      const leftover = Math.max(1, Math.round((nVotes - remaining) * 0.4));
      result.push(leftover);
    }
    return result.slice(0, opts.length);
  }
  const weights = opts.map(() => Math.random() + 0.4);
  const sumW = weights.reduce((s, x) => s + x, 0);
  return weights.map((w) => Math.max(1, Math.round((w / sumW) * nVotes)));
}

async function main() {
  console.log("🌱 Seeding CURATED WHATDO onboarding example posts...");
  console.log(`   → ${POSTS.length} posts in this curated batch.\n`);

  const allUsers = await prisma.user.findMany({
    select: { id: true, role: true },
    take: 60,
  });
  if (allUsers.length === 0) {
    throw new Error(
      "No users in DB — run `npx prisma db seed` first to create the base users, then run this script."
    );
  }
  const userCreators = allUsers.filter((u) => u.role !== "ADMIN");
  console.log(`   → Picking creators from ${userCreators.length} existing non-admin users.`);

  const allCategories = await prisma.category.findMany();
  if (allCategories.length === 0) {
    throw new Error("No categories in DB — run base seed first.");
  }
  const catBySlug: Record<string, Category> = {};
  for (const c of allCategories) catBySlug[c.slug] = c;

  const existingTags = await prisma.tag.findMany();
  const tagByName: Record<string, { id: string; name: string }> = {};
  for (const t of existingTags) tagByName[t.name] = t;

  const createdPosts: {
    id: string;
    slug: string;
    type: PostType;
    question: string;
    options: { id: string; value: string; label: string; sortOrder: number }[];
  }[] = [];

  const optionVoteCounts: Record<string, number> = {};
  const postVoteCounts: Record<string, number> = {};

  const SALT = Date.now();

  console.log("\n📝 Creating posts + options...\n");
  for (let i = 0; i < POSTS.length; i++) {
    const def = POSTS[i];
    if (!def) continue;

    const category = catBySlug[def.category] ?? allCategories[0];
    const creator = pick(userCreators);
    const daysAgoMin = def.daysAgoMin ?? 1;
    const daysAgoMax = def.daysAgoMax ?? 25;
    const createdAt = new Date(
      Date.now() -
        rand(daysAgoMin, daysAgoMax) * 86_400_000 -
        rand(0, 23) * 3_600_000 -
        rand(0, 59) * 60_000
    );

    const isPrediction = def.type === PostType.PREDICTION;
    const closeVotingAt = isPrediction
      ? new Date(createdAt.getTime() + rand(7, 90) * 86_400_000)
      : null;

    const nVotes = rand(def.nVotesMin ?? 50, def.nVotesMax ?? 300);

    const baseSlug = `${slugify(def.question).slice(0, 55)}-${(SALT + i).toString(36)}`;

    try {
      const post = await prisma.post.create({
        data: {
          slug: baseSlug,
          creatorId: creator.id,
          categoryId: category.id,
          type: def.type,
          question: def.question,
          isAnonymous: false,
          allowComments: true,
          status: PostStatus.PUBLISHED,
          isClosed: false,
          closeVotingAt,
          isFeatured: !!def.featured,
          trendingScore: def.featured ? rand(800, 9500) : rand(20, 300),
          viralityScore: def.featured ? rand(400, 4500) : rand(10, 250),
          controversyScore:
            def.type === PostType.YES_NO || def.type === PostType.DECISION
              ? rand(80, 700)
              : rand(0, 250),
          voteCount: 0,
          viewCount: Math.max(nVotes * 5, rand(500, 10_000)),
          shareCount: rand(0, 200),
          saveCount: rand(0, 150),
          likeCount: rand(5, Math.max(6, Math.round(nVotes / 3))),
          commentCount: rand(2, Math.max(3, Math.round(nVotes / 10))),
          createdAt,
          updatedAt: createdAt,
          options: { create: def.options },
        },
        select: {
          id: true,
          slug: true,
          type: true,
          question: true,
          options: {
            select: { id: true, value: true, label: true, sortOrder: true },
          },
        },
      });

      // Attach tags (upsert)
      if (def.tags && def.tags.length > 0) {
        const tagsData = def.tags.map(async (tagName, idx) => {
          const lowerName = tagName.toLowerCase().replace(/\s+/g, "-").slice(0, 30);
          let tag = tagByName[lowerName];
          if (!tag) {
            const created = await prisma.tag.upsert({
              where: { name: lowerName },
              create: {
                name: lowerName,
                slug: lowerName,
                categoryId: category.id,
              },
              update: { categoryId: category.id },
              select: { id: true, name: true },
            });
            tag = created;
            tagByName[created.name] = created;
          }
          return prisma.postTag.upsert({
            where: {
              postId_tagId: { postId: post.id, tagId: tag.id },
            },
            create: { postId: post.id, tagId: tag.id },
            update: {},
          });
        });
        await Promise.all(tagsData);
        // Update tag postCount approx
        await prisma.category.update({
          where: { id: category.id },
          data: { postCount: { increment: 1 } },
        });
      }

      // Generate votes on deterministic distribution (seeded users only; use many -> deduplicated pickMany)
      const optsSorted = [...post.options].sort((a, b) => a.sortOrder - b.sortOrder);
      const distribution = randomDistribution(
        optsSorted,
        Math.min(nVotes, Math.max(1, userCreators.length * 3)),
        def.type
      );

      const optionPool: string[] = [];
      optsSorted.forEach((opt, idx) => {
        const count = Math.max(1, distribution[idx] ?? 1);
        for (let k = 0; k < count; k++) optionPool.push(opt.id);
      });

      const voters = pickMany(userCreators, Math.min(optionPool.length, userCreators.length));
      const finalVoters = voters.slice(0, optionPool.length);
      postVoteCounts[post.id] = finalVoters.length;

      const votePayloads = finalVoters.map((user, k) => {
        const optionId = optionPool[k] ?? optsSorted[0]?.id;
        if (optionId) {
          optionVoteCounts[optionId] = (optionVoteCounts[optionId] ?? 0) + 1;
        }
        const extra: any = {};
        if (def.type === PostType.RATING) {
          const opt = optsSorted.find((o) => o.id === optionId);
          extra.ratingValue = opt ? parseInt(opt.value, 10) || 5 : rand(5, 8);
        } else if (def.type === PostType.EMOJI) {
          const opt = optsSorted.find((o) => o.id === optionId);
          extra.emojiValue = opt?.value ?? "🔥";
        } else if (def.type === PostType.PRICE) {
          const opt = optsSorted.find((o) => o.id === optionId);
          extra.priceValue = opt ? parseInt(opt.value, 10) || 0 : rand(5000, 100000);
        }
        return {
          postId: post.id,
          userId: user.id,
          optionId,
          ...extra,
          createdAt: new Date(
            createdAt.getTime() + rand(10 * 60_000, 10 * 24 * 3600_000)
          ),
        };
      });

      if (votePayloads.length > 0) {
        await prisma.vote.createMany({
          data: votePayloads,
          skipDuplicates: true,
        });
      }

      createdPosts.push(post);
      console.log(
        `   [${i + 1}/${POSTS.length}] ✓ ${def.type.padEnd(15)} ${def.category.padEnd(
          12
        )} "${def.question.slice(0, 70)}${def.question.length > 70 ? "…" : ""}" (${
          finalVoters.length
        } votes)`
      );
    } catch (err) {
      console.error(`   [${i + 1}/${POSTS.length}] ✗ FAILED for "${def.question}"`);
      console.error(err);
      process.exitCode = 1;
    }
  }

  console.log(`\n🔢 Updating vote counts on Post + PostOption for ${createdPosts.length} posts...`);
  const counterUpdates: Promise<any>[] = [];
  for (const post of createdPosts) {
    counterUpdates.push(
      prisma.post.update({
        where: { id: post.id },
        data: {
          voteCount: postVoteCounts[post.id] ?? 0,
        },
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
  await Promise.all(counterUpdates);
  console.log(`✅ Counters updated.`);

  const totalVotes = Object.values(postVoteCounts).reduce((s, x) => s + x, 0);
  console.log(`\n🎉 FINISHED. ${createdPosts.length} curated posts created with ~${totalVotes} total votes across them.`);
  console.log(
    "Run this again anytime you want to refresh example posts — it's a standalone script, it will not wipe existing posts."
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
