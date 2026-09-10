import {
  SCORING,
  TRENDING,
  VIRALITY,
  FEED,
  OPINION,
} from "../constants";

export function computeControversyScore(
  yesVotes: number,
  noVotes: number,
): number {
  const total = yesVotes + noVotes;
  if (total === 0) return 0;
  const ratio = Math.abs((yesVotes - noVotes) / (total + Number.EPSILON));
  return 1 - ratio;
}

export function computeControversyScoreFromCounts(
  optionVoteCounts: number[],
): number {
  if (optionVoteCounts.length < 2) return 0;
  const total = optionVoteCounts.reduce((a, b) => a + b, 0);
  if (total === 0) return 0;
  const max = Math.max(...optionVoteCounts);
  const min = Math.min(...optionVoteCounts.filter((c) => c > 0));
  if (optionVoteCounts.filter((c) => c > 0).length < 2) return 0;
  const ratio = Math.abs((max - min) / (total + Number.EPSILON));
  return 1 - ratio;
}

export function computeTrendingScore(params: {
  voteCount: number;
  commentCount: number;
  likeCount: number;
  shareCount: number;
  createdAt: Date;
  decayHalfLifeHours?: number;
}): number {
  const {
    voteCount,
    commentCount,
    likeCount,
    shareCount,
    createdAt,
    decayHalfLifeHours = TRENDING.HALF_LIFE_HOURS,
  } = params;

  const score =
    voteCount * TRENDING.WEIGHTS.VOTES +
    commentCount * TRENDING.WEIGHTS.COMMENTS +
    likeCount * TRENDING.WEIGHTS.LIKES +
    shareCount * TRENDING.WEIGHTS.SHARES;

  const ageMs = Date.now() - createdAt.getTime();
  const ageHours = ageMs / (1000 * 60 * 60);
  const decay = Math.pow(0.5, ageHours / decayHalfLifeHours);

  return score * decay;
}

export function computeViralityScore(params: {
  voteCount: number;
  commentCount: number;
  likeCount: number;
  shareCount: number;
  createdAt: Date;
  controversyScore?: number | null;
}): number {
  const {
    voteCount,
    commentCount,
    likeCount,
    shareCount,
    createdAt,
    controversyScore = 0,
  } = params;

  const engagementBase =
    voteCount * VIRALITY.WEIGHTS.VOTES +
    commentCount * VIRALITY.WEIGHTS.COMMENTS +
    likeCount * VIRALITY.WEIGHTS.LIKES +
    shareCount * VIRALITY.WEIGHTS.SHARES;

  const controversyBoost =
    1 + (controversyScore ?? 0) * VIRALITY.CONTROVERSY_BOOST;

  const ageMs = Date.now() - createdAt.getTime();
  const ageHours = ageMs / (1000 * 60 * 60);
  const decay = Math.exp(-VIRALITY.DECAY_RATE * ageHours);

  return engagementBase * controversyBoost * decay;
}

export function feedScoreWeighted(params: {
  trendingScore: number | null;
  viralityScore: number | null;
  controversyScore: number | null;
  createdAt: Date;
  categoryInterestWeight?: number | null;
  isFeatured?: boolean;
  creatorId: string;
  recentCreatorPosts?: number;
}): number {
  const {
    trendingScore,
    viralityScore,
    controversyScore,
    createdAt,
    categoryInterestWeight = 1,
    isFeatured = false,
    recentCreatorPosts = 0,
  } = params;

  const ageMs = Date.now() - createdAt.getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  const freshness = Math.exp(-FEED.FRESHNESS_DECAY_DAYS * ageDays);

  const base =
    (trendingScore ?? 0) * FEED.WEIGHTS.TRENDING +
    (viralityScore ?? 0) * FEED.WEIGHTS.VIRALITY +
    (controversyScore ?? 0) * FEED.WEIGHTS.CONTROVERSY +
    freshness * FEED.WEIGHTS.FRESHNESS;

  const interestMult = categoryInterestWeight ?? 1;
  const featuredBoost = isFeatured ? FEED.FEATURED_WEIGHT : 1;
  const diversityPenalty = Math.max(
    0.1,
    1 - (recentCreatorPosts - 1) * FEED.DIVERSITY_PENALTY_PER_POST,
  );

  return base * interestMult * featuredBoost * diversityPenalty;
}

export function computeOpinionScoreForVote(
  currentScore: number,
  totalVotes: number,
): number {
  const increment = OPINION.SCORE_PER_VOTE;
  const diminishingReturns = Math.max(
    OPINION.MIN_MULTIPLIER,
    1 - Math.log10(Math.max(1, totalVotes)) * OPINION.DIMINISHING_FACTOR,
  );
  return Math.round(currentScore + increment * diminishingReturns);
}

export function computeOpinionScoreForPost(
  currentScore: number,
): number {
  return currentScore + OPINION.SCORE_PER_POST;
}
