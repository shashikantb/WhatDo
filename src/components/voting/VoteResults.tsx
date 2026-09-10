"use client";

import * as React from "react";
import { Check, Flame, Lock, CheckCircle2, XCircle } from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";
import { Badge } from "@/components/design-system/Badge";
import { ProgressBar } from "@/components/design-system/ProgressBar";

export type PostTypeForResults =
  | "YES_NO"
  | "MULTIPLE_CHOICE"
  | "POLL"
  | "A_VS_B"
  | "RATING"
  | "EMOJI"
  | "PRICE"
  | "DECISION"
  | "PREDICTION";

export interface VoteResultOption {
  id: string;
  label: string;
  voteCount: number;
  color?: string | null;
  imageUrl?: string | null;
}

export interface VoteResultsProps {
  options: VoteResultOption[];
  totalVotes: number;
  postType?: PostTypeForResults;
  selectedOptionId?: string | null;
  userRating?: number | null;
  userEmoji?: string | null;
  userPrice?: number | null;
  prediction?: {
    isResolved?: boolean;
    correctOptionId?: string | null;
    userVotedOptionId?: string | null;
    status?: "OPEN" | "CLOSED" | "RESOLVED";
  };
  allVotes?: Array<{
    id?: string;
    optionId?: string | null;
    ratingValue?: number | null;
    emojiValue?: string | null;
    priceValue?: number | null;
  }>;
  showVoters?: boolean;
  isNewVote?: boolean;
  isClosed?: boolean;
  className?: string;
}

const BAR_COLORS = [
  "bg-primary",
  "bg-accent",
  "bg-success",
  "bg-warning",
  "bg-blue-500",
  "bg-purple-500",
  "bg-cyan-500",
  "bg-pink-500",
  "bg-orange-500",
  "bg-teal-500",
];

function calculatePercentagesWithRounding(
  counts: number[],
  total: number
): number[] {
  if (total <= 0) return counts.map(() => 0);
  const raw = counts.map((c) => (c / total) * 100);
  const floors = raw.map((r) => Math.floor(r));
  const floorSum = floors.reduce((a, b) => a + b, 0);
  let remainder = 100 - floorSum;
  const decimals = raw.map((r, i) => ({ idx: i, dec: r - Math.floor(r) }));
  decimals.sort((a, b) => b.dec - a.dec);
  const result = [...floors];
  let di = 0;
  while (remainder > 0 && di < decimals.length) {
    const d = decimals[di];
    if (!d) break;
    result[d.idx] = (result[d.idx] ?? 0) + 1;
    remainder -= 1;
    di += 1;
  }
  return result;
}

function isControversial(percentages: number[]): boolean {
  if (percentages.length < 2) return false;
  const sorted = [...percentages].sort((a, b) => b - a);
  const a = sorted[0] ?? 0;
  const b = sorted[1] ?? 0;
  const total = a + b;
  if (total <= 0) return false;
  const score = 1 - Math.abs(a - b) / total;
  return score > 0.7;
}

function PredictionBanner({
  prediction,
}: {
  prediction: NonNullable<VoteResultsProps["prediction"]>;
}) {
  if (prediction.status === "OPEN") {
    return (
      <div className="mb-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-info/10 border border-info/20">
        <span className="h-2 w-2 rounded-full bg-info animate-pulse" />
        <span className="text-xs font-semibold text-info-foreground">PREDICTION · OPEN</span>
      </div>
    );
  }
  if (prediction.status === "CLOSED") {
    return (
      <div className="mb-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-warning/10 border border-warning/20">
        <Lock className="w-3 h-3 text-warning" />
        <span className="text-xs font-semibold text-warning">PREDICTION · AWAITING RESULT</span>
      </div>
    );
  }
  if (prediction.status === "RESOLVED" && prediction.userVotedOptionId) {
    const isCorrect =
      prediction.userVotedOptionId === prediction.correctOptionId;
    return (
      <div
        className={cn(
          "mb-3 px-4 py-2.5 rounded-xl border flex items-start gap-2.5",
          isCorrect
            ? "bg-success/10 border-success/30"
            : "bg-danger/10 border-danger/30",
        )}
      >
        {isCorrect ? (
          <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
        ) : (
          <XCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
        )}
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              "text-sm font-bold",
              isCorrect ? "text-success" : "text-danger",
            )}
          >
            Prediction Result: {isCorrect ? "CORRECT ✅" : "INCORRECT ❌"}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isCorrect
              ? "Great call — +10 Opinion Score awarded!"
              : "Better luck next time. Results matter!"}
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="mb-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-success/10 border border-success/20">
      <CheckCircle2 className="w-3 h-3 text-success" />
      <span className="text-xs font-semibold text-success">PREDICTION · RESOLVED</span>
    </div>
  );
}

function RatingRenderer({
  allVotes,
  totalVotes,
  userRating,
  options,
}: {
  allVotes: NonNullable<VoteResultsProps["allVotes"]>;
  totalVotes: number;
  userRating: number | null | undefined;
  options: VoteResultOption[];
}) {
  const ratings = allVotes
    .map((v) => v.ratingValue)
    .filter((n): n is number => typeof n === "number");
  if (ratings.length === 0 && totalVotes > 0 && options.length > 0) {
    const maxVal = options.length;
    for (let i = 1; i <= maxVal; i++) {
      const opt = options[i - 1];
      for (let c = 0; c < (opt?.voteCount ?? 0); c++) ratings.push(i);
    }
  }
  if (ratings.length === 0) return null;
  const sum = ratings.reduce((a, b) => a + b, 0);
  const avg = sum / ratings.length;
  const distribution: Record<number, number> = {};
  for (let i = 1; i <= 10; i++) distribution[i] = 0;
  for (const r of ratings) {
    const idx = Math.round(Math.max(1, Math.min(10, r)));
    distribution[idx] = (distribution[idx] ?? 0) + 1;
  }
  const max = Math.max(1, ...Object.values(distribution));
  return (
    <div className="space-y-3">
      <div className="flex items-baseline gap-3">
        <div className="text-3xl font-black tabular-nums text-foreground">
          {avg.toFixed(1)}
        </div>
        <div className="flex-1">
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-warning via-accent to-primary rounded-full transition-[width] duration-500"
              style={{ width: `${(avg / 10) * 100}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Average rating from {formatNumber(ratings.length)} votes
          </p>
        </div>
        {typeof userRating === "number" && (
          <Badge variant="info" size="sm">
            Your rating: {userRating}
          </Badge>
        )}
      </div>
      <div className="flex items-end gap-1 h-16 px-1">
        {Array.from({ length: 10 }).map((_, i) => {
          const star = i + 1;
          const count = distribution[star] ?? 0;
          const hPct = (count / max) * 100;
          const isUser = userRating === star;
          return (
            <div key={star} className="flex-1 flex flex-col items-center gap-1.5">
              <div className="w-full flex items-end justify-center h-12">
                <div
                  className={cn(
                    "w-full rounded-t-md transition-[height] duration-500",
                    isUser ? "bg-primary" : "bg-accent/60",
                  )}
                  style={{ height: `${Math.max(6, hPct)}%` }}
                />
              </div>
              <span
                className={cn(
                  "text-[10px] font-bold tabular-nums",
                  isUser ? "text-primary" : "text-muted-foreground",
                )}
              >
                {star}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EmojiRenderer({
  allVotes,
  totalVotes,
  options,
  userEmoji,
}: {
  allVotes: NonNullable<VoteResultsProps["allVotes"]>;
  totalVotes: number;
  options: VoteResultOption[];
  userEmoji: string | null | undefined;
}) {
  const counts: Record<string, number> = {};
  const fromVotes = allVotes
    .map((v) => v.emojiValue)
    .filter((s): s is string => typeof s === "string" && s.length > 0);
  for (const e of fromVotes) counts[e] = (counts[e] ?? 0) + 1;
  const fallbacks = options.map((o) => o.label).filter(Boolean);
  if (Object.keys(counts).length === 0 && fallbacks.length > 0) {
    for (const opt of options) {
      if (opt.voteCount > 0) counts[opt.label] = opt.voteCount;
    }
  }
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return null;
  const total = totalVotes || entries.reduce((s, [, c]) => s + c, 0);
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
      {entries.map(([emoji, count]) => {
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        const isUser = userEmoji === emoji;
        return (
          <div
            key={emoji}
            className={cn(
              "relative overflow-hidden rounded-xl border p-3 text-center transition-all",
              isUser
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border bg-muted/30",
            )}
          >
            <div className="absolute inset-x-0 bottom-0 h-[4px] bg-accent/50">
              <div
                className={cn(
                  "h-full transition-[width] duration-500",
                  isUser ? "bg-primary" : "bg-accent",
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="text-3xl leading-none mb-1.5">{emoji}</div>
            <div className="text-xs font-bold tabular-nums text-foreground">
              {pct}%
            </div>
            <div className="text-[10px] text-muted-foreground tabular-nums">
              {formatNumber(count)} votes
            </div>
            {isUser && (
              <div className="absolute top-1.5 right-1.5">
                <span className="flex items-center justify-center h-4 w-4 rounded-full bg-primary text-primary-foreground">
                  <Check className="w-2.5 h-2.5" />
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function PriceRenderer({
  allVotes,
  options,
  userPrice,
}: {
  allVotes: NonNullable<VoteResultsProps["allVotes"]>;
  options: VoteResultOption[];
  userPrice: number | null | undefined;
}) {
  const prices = allVotes
    .map((v) => (typeof v.priceValue === "number" ? v.priceValue : typeof (v.priceValue as any)?.toNumber === "function" ? (v.priceValue as any).toNumber() : null))
    .filter((n): n is number => typeof n === "number" && !Number.isNaN(n));
  if (prices.length === 0 && options.length > 0) {
    for (const opt of options) {
      const val = Number(opt.label || opt.id);
      for (let c = 0; c < opt.voteCount; c++) if (!Number.isNaN(val)) prices.push(val);
    }
  }
  if (prices.length === 0) return null;
  const sorted = prices.slice().sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const avg = sorted.reduce((s, n) => s + n, 0) / sorted.length;
  const buckets: Array<{ label: string; min: number; max: number; count: number }> = [];
  const min = Math.min(...sorted);
  const max = Math.max(...sorted);
  const step = Math.max(1, Math.ceil((max - min) / 5));
  for (let lo = Math.floor(min / step) * step; lo <= Math.ceil(max / step) * step; lo += step) {
    const hi = lo + step;
    buckets.push({
      label: `${lo}-${hi}`,
      min: lo,
      max: hi,
      count: sorted.filter((p) => p >= lo && p < hi).length,
    });
  }
  const maxCount = Math.max(1, ...buckets.map((b) => b.count));
  const fmt = (n: number) => {
    if (n >= 1000) return `$${(n / 1000).toFixed(0)}k`;
    return `$${Math.round(n)}`;
  };
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-muted/30 p-3">
          <div className="text-[10px] uppercase font-semibold tracking-wide text-muted-foreground">
            Community average
          </div>
          <div className="text-2xl font-black tabular-nums text-foreground mt-1">
            {fmt(avg)}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-muted/30 p-3">
          <div className="text-[10px] uppercase font-semibold tracking-wide text-muted-foreground">
            Median estimate
          </div>
          <div className="text-2xl font-black tabular-nums text-primary mt-1">
            {fmt(median ?? 0)}
          </div>
        </div>
      </div>
      <div className="flex items-end gap-1 h-20 px-1">
        {buckets.map((b) => {
          const hPct = (b.count / maxCount) * 100;
          const isUser =
            typeof userPrice === "number" && userPrice >= b.min && userPrice < b.max;
          return (
            <div key={b.label} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex items-end justify-center h-16">
                <div
                  className={cn(
                    "w-full rounded-t-md transition-[height] duration-500",
                    isUser ? "bg-primary" : "bg-gradient-to-t from-accent to-accent/70",
                  )}
                  style={{ height: `${Math.max(8, hPct)}%` }}
                />
              </div>
              <div
                className={cn(
                  "text-[10px] font-bold tabular-nums",
                  isUser ? "text-primary" : "text-muted-foreground",
                )}
              >
                {b.label}
              </div>
            </div>
          );
        })}
      </div>
      {typeof userPrice === "number" && (
        <div className="flex items-center justify-between text-xs pt-1 border-t border-border/60">
          <span className="text-muted-foreground">Your estimate</span>
          <Badge variant="info" size="sm">
            {fmt(userPrice)}
          </Badge>
        </div>
      )}
    </div>
  );
}

function AVersusBRenderer({
  options,
  totalVotes,
  selectedOptionId,
}: {
  options: VoteResultOption[];
  totalVotes: number;
  selectedOptionId: string | null | undefined;
}) {
  if (options.length < 2) return null;
  const [optA, optB] = options;
  if (!optA || !optB) return null;
  const countA = optA.voteCount;
  const countB = optB.voteCount;
  const total = totalVotes || countA + countB;
  const pctA = total > 0 ? Math.round((countA / total) * 100) : 0;
  const pctB = 100 - pctA;
  const selectedA = selectedOptionId === optA.id;
  const selectedB = selectedOptionId === optB.id;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div
          className={cn(
            "rounded-2xl p-4 text-center border-2 transition-all",
            selectedA
              ? "border-emerald-500/50 bg-emerald-500/5"
              : "border-border bg-muted/30",
          )}
        >
          {optA.imageUrl && (
            <div className="mb-2 aspect-video rounded-xl overflow-hidden bg-muted">
              <img
                src={optA.imageUrl}
                alt={optA.label}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="text-2xl font-black text-emerald-600 tabular-nums">
            {pctA}%
          </div>
          <p className="text-sm font-semibold text-foreground mt-1 leading-tight">
            {optA.label}
          </p>
          <div className="text-xs text-muted-foreground tabular-nums mt-0.5">
            {formatNumber(countA)} votes
          </div>
          {selectedA && (
            <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-bold">
              <Check className="w-3 h-3" /> Your pick
            </div>
          )}
        </div>
        <div
          className={cn(
            "rounded-2xl p-4 text-center border-2 transition-all",
            selectedB
              ? "border-rose-500/50 bg-rose-500/5"
              : "border-border bg-muted/30",
          )}
        >
          {optB.imageUrl && (
            <div className="mb-2 aspect-video rounded-xl overflow-hidden bg-muted">
              <img
                src={optB.imageUrl}
                alt={optB.label}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="text-2xl font-black text-rose-600 tabular-nums">
            {pctB}%
          </div>
          <p className="text-sm font-semibold text-foreground mt-1 leading-tight">
            {optB.label}
          </p>
          <div className="text-xs text-muted-foreground tabular-nums mt-0.5">
            {formatNumber(countB)} votes
          </div>
          {selectedB && (
            <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 text-[10px] font-bold">
              <Check className="w-3 h-3" /> Your pick
            </div>
          )}
        </div>
      </div>
      <div className="relative h-4 rounded-full overflow-hidden bg-muted">
        <div className="absolute inset-y-0 left-0 bg-emerald-500 rounded-l-full transition-[width] duration-700" style={{ width: `${pctA}%` }} />
        <div className="absolute inset-y-0 right-0 bg-rose-500 rounded-r-full transition-[width] duration-700" style={{ width: `${Math.max(0, 100 - pctA)}%` }} />
      </div>
    </div>
  );
}

export const VoteResults: React.FC<VoteResultsProps> = ({
  options,
  totalVotes,
  postType,
  selectedOptionId = null,
  userRating,
  userEmoji,
  userPrice,
  prediction,
  allVotes,
  isNewVote = false,
  isClosed = false,
  className,
}) => {
  const [mounted, setMounted] = React.useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);

  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  React.useEffect(() => {
    if (prefersReducedMotion) {
      setMounted(true);
    } else {
      const t = requestAnimationFrame(() => setMounted(true));
      return () => cancelAnimationFrame(t);
    }
  }, [prefersReducedMotion]);

  const voteCounts = options.map((o) => o.voteCount);
  const percentages = calculatePercentagesWithRounding(voteCounts, totalVotes);
  const controversial =
    (postType === "YES_NO" || postType === "DECISION" || postType === "PREDICTION")
      ? isControversial(percentages)
      : false;
  const safeOptions = options.length > 0 ? options : [];

  const controversialTypesForControversy = postType === "YES_NO" || postType === "DECISION" || postType === "PREDICTION";

  const predictionStatus = React.useMemo<"OPEN" | "CLOSED" | "RESOLVED" | undefined>(() => {
    if (postType !== "PREDICTION") return undefined;
    if (prediction?.status) return prediction.status;
    if (prediction?.isResolved) return "RESOLVED";
    if (isClosed) return "CLOSED";
    return "OPEN";
  }, [prediction, postType, isClosed]);

  const needsSpecialRenderer =
    postType === "RATING" ||
    postType === "EMOJI" ||
    postType === "PRICE" ||
    postType === "A_VS_B";

  return (
    <div className={cn("w-full space-y-4", className)}>
      {predictionStatus && (
        <PredictionBanner prediction={{ ...prediction, status: predictionStatus }} />
      )}

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {controversial && controversialTypesForControversy && (
            <Badge variant="warning" size="sm">
              <Flame className="w-3 h-3 mr-1 inline" />
              Highly Controversial
            </Badge>
          )}
          {isClosed && postType !== "PREDICTION" && (
            <Badge variant="default" size="sm">
              <Lock className="w-3 h-3 mr-1 inline" />
              Voting Closed
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground tabular-nums">
          <span className="text-foreground font-semibold">
            {formatNumber(totalVotes)}
          </span>{" "}
          {totalVotes === 1 ? "vote" : "votes"}
        </p>
      </div>

      {postType === "RATING" && (
        <RatingRenderer
          allVotes={allVotes ?? []}
          totalVotes={totalVotes}
          userRating={userRating}
          options={safeOptions}
        />
      )}
      {postType === "EMOJI" && (
        <EmojiRenderer
          allVotes={allVotes ?? []}
          totalVotes={totalVotes}
          options={safeOptions}
          userEmoji={userEmoji}
        />
      )}
      {postType === "PRICE" && (
        <PriceRenderer
          allVotes={allVotes ?? []}
          options={safeOptions}
          userPrice={userPrice}
        />
      )}
      {postType === "A_VS_B" && (
        <AVersusBRenderer
          options={safeOptions}
          totalVotes={totalVotes}
          selectedOptionId={selectedOptionId}
        />
      )}

      {!needsSpecialRenderer && safeOptions.length > 0 && (
        <div className="space-y-3">
          {safeOptions.map((opt, idx) => {
            const pct = percentages[idx] ?? 0;
            const isUserChoice = selectedOptionId === opt.id;
            const isCorrectPrediction =
              postType === "PREDICTION" &&
              prediction?.isResolved &&
              prediction?.correctOptionId === opt.id;
            const customBarColor = opt.color ? undefined : undefined;
            const defaultBarColor = isUserChoice
              ? "bg-primary"
              : BAR_COLORS[idx % BAR_COLORS.length];
            const barColor =
              isCorrectPrediction
                ? "bg-success"
                : customBarColor || defaultBarColor;
            const delay = !prefersReducedMotion ? idx * 50 : 0;

            return (
              <div
                key={opt.id}
                className={cn(
                  "space-y-1.5",
                  isNewVote &&
                    !prefersReducedMotion &&
                    "animate-[slide-up_0.35s_ease-out_forwards] opacity-0",
                  isUserChoice &&
                    "p-2 -mx-2 rounded-xl bg-primary/5 border border-primary/10",
                  isCorrectPrediction &&
                    "!bg-success/5 !border-success/20",
                )}
                style={
                  isNewVote && !prefersReducedMotion
                    ? ({ animationDelay: `${delay}ms` } as React.CSSProperties)
                    : undefined
                }
              >
                <div className="flex items-center justify-between gap-3 text-sm">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {isUserChoice && (
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-sm">
                        <Check className="w-3 h-3" strokeWidth={3} />
                      </span>
                    )}
                    {isCorrectPrediction && (
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-success text-white flex items-center justify-center shadow-sm">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </span>
                    )}
                    <span
                      className={cn(
                        "truncate",
                        isUserChoice
                          ? "font-bold text-primary"
                          : isCorrectPrediction
                          ? "font-bold text-success"
                          : "font-medium text-foreground",
                      )}
                    >
                      {opt.label}
                      {isCorrectPrediction && (
                        <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-success">
                          Correct
                        </span>
                      )}
                    </span>
                  </div>
                  <div
                    className={cn(
                      "flex items-center gap-2 flex-shrink-0 tabular-nums",
                      isNewVote &&
                        !prefersReducedMotion &&
                        "animate-[scale-in_0.4s_ease-out_forwards] opacity-0 scale-75",
                      (isUserChoice || isCorrectPrediction) && "font-bold",
                    )}
                    style={
                      isNewVote && !prefersReducedMotion
                        ? ({
                            animationDelay: `${delay + 200}ms`,
                          } as React.CSSProperties)
                        : undefined
                    }
                  >
                    <span
                      className={
                        isUserChoice
                          ? "text-primary"
                          : isCorrectPrediction
                          ? "text-success"
                          : "text-foreground"
                      }
                    >
                      {pct}%
                    </span>
                    <span className="text-muted-foreground text-xs">
                      ({formatNumber(opt.voteCount)})
                    </span>
                  </div>
                </div>
                <ProgressBar
                  value={mounted ? pct : 0}
                  className={cn(
                    barColor,
                    !prefersReducedMotion && "transition-[width] duration-[600ms]",
                  )}
                />
              </div>
            );
          })}
        </div>
      )}

      {isNewVote && !isClosed && !needsSpecialRenderer && (
        <div className="flex items-center justify-between pt-1 border-t border-border/50">
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-success">
            <Check className="w-3.5 h-3.5" />
            Your vote counted
          </span>
        </div>
      )}
    </div>
  );
};
