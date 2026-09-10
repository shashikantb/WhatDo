export const POST_TYPES = [
  "YES_NO",
  "MULTIPLE_CHOICE",
  "A_VS_B",
  "RATING",
  "EMOJI",
  "POLL",
  "PRICE",
  "DECISION",
  "PREDICTION",
] as const;
export const ROLES = ["USER", "MODERATOR", "ADMIN", "SUPER_ADMIN"] as const;
export const POST_STATUS = ["DRAFT", "PUBLISHED", "ARCHIVED", "REMOVED"] as const;
export const VOTE_OPTIONS = ["UP", "DOWN"] as const;
export const NOTIFICATION_TYPES = [
  "VOTE",
  "COMMENT",
  "FOLLOW",
  "MENTION",
  "POST_APPROVAL",
  "POST_REMOVAL",
] as const;

export const CATEGORIES = [
  { id: "technology", name: "Technology", slug: "technology", icon: "Cpu" },
  { id: "entertainment", name: "Entertainment", slug: "entertainment", icon: "Film" },
  { id: "sports", name: "Sports", slug: "sports", icon: "Trophy" },
  { id: "news", name: "News & Politics", slug: "news", icon: "Newspaper" },
  { id: "gaming", name: "Gaming", slug: "gaming", icon: "Gamepad2" },
  { id: "food", name: "Food & Cooking", slug: "food", icon: "UtensilsCrossed" },
  { id: "travel", name: "Travel", slug: "travel", icon: "Plane" },
  { id: "fitness", name: "Fitness & Health", slug: "fitness", icon: "Dumbbell" },
  { id: "education", name: "Education", slug: "education", icon: "GraduationCap" },
  { id: "finance", name: "Finance", slug: "finance", icon: "DollarSign" },
  { id: "art", name: "Art & Design", slug: "art", icon: "Palette" },
  { id: "science", name: "Science", slug: "science", icon: "FlaskConical" },
] as const;

export const RATE_LIMITS = {
  CREATE_POST: { limit: 10, window: 60 * 60 * 1000 },
  CREATE_COMMENT: { limit: 30, window: 60 * 60 * 1000 },
  VOTE: { limit: 100, window: 60 * 60 * 1000 },
  FOLLOW: { limit: 50, window: 60 * 60 * 1000 },
  AUTH: { limit: 5, window: 15 * 60 * 1000 },
  UPLOAD: { limit: 20, window: 60 * 60 * 1000 },
} as const;

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

export const POST_CONTENT_LIMITS = {
  TITLE_MIN: 3,
  TITLE_MAX: 200,
  DESCRIPTION_MAX: 5000,
  POLL_OPTIONS_MIN: 2,
  POLL_OPTIONS_MAX: 10,
  POLL_OPTION_MAX: 100,
  TAG_MAX: 5,
  TAG_LENGTH: 30,
} as const;

export const USER_PROFILE_LIMITS = {
  USERNAME_MIN: 3,
  USERNAME_MAX: 20,
  BIO_MAX: 250,
  DISPLAY_NAME_MAX: 50,
} as const;

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const SCORING = {
  CONTROVERSY_EPSILON: Number.EPSILON,
} as const;

export const TRENDING = {
  HALF_LIFE_HOURS: 24,
  WEIGHTS: {
    VOTES: 1,
    COMMENTS: 3,
    LIKES: 0.5,
    SHARES: 5,
  },
} as const;

export const VIRALITY = {
  DECAY_RATE: 0.05,
  CONTROVERSY_BOOST: 0.5,
  WEIGHTS: {
    VOTES: 1,
    COMMENTS: 4,
    LIKES: 1,
    SHARES: 8,
  },
} as const;

export const FEED = {
  FRESHNESS_DECAY_DAYS: 0.5,
  FEATURED_WEIGHT: 5,
  DIVERSITY_PENALTY_PER_POST: 0.2,
  WEIGHTS: {
    TRENDING: 0.4,
    VIRALITY: 0.3,
    CONTROVERSY: 0.1,
    FRESHNESS: 0.2,
  },
} as const;

export const OPINION = {
  SCORE_PER_VOTE: 1,
  SCORE_PER_POST: 5,
  PREDICTION_CORRECT: 10,
  MIN_MULTIPLIER: 0.1,
  DIMINISHING_FACTOR: 0.1,
} as const;

export const MODERATION = {
  AUTO_MODERATION_REPORT_THRESHOLD: 3,
} as const;

export const USER_SELECT_PUBLIC = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  role: true,
  isVerified: true,
  opinionScore: true,
  totalVotes: true,
  totalPosts: true,
  predictionsCorrect: true,
  predictionsMade: true,
  createdAt: true,
  bio: true,
} as const;

