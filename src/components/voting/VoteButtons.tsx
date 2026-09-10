"use client";

import * as React from "react";
import { ThumbsUp, ThumbsDown, Clock, Check } from "lucide-react";
import { useSession } from "next-auth/react";
import { cn, formatRelativeTime } from "@/lib/utils";
import { AVersusB, AVersusBOption } from "./AVersusB";
import { RatingSlider } from "./RatingSlider";
import { EmojiPicker } from "./EmojiPicker";
import { PriceTiers, PriceTier } from "./PriceTiers";
import { Badge } from "@/components/design-system/Badge";
import { trpc } from "@/lib/trpc/client";
import { useLoginModal, ReturnIntent } from "@/components/auth/LoginModal";
import { useToast } from "@/components/design-system/Toaster";
import { trackEvent } from "@/lib/analytics";

export type PostType =
  | "YES_NO"
  | "MULTIPLE_CHOICE"
  | "POLL"
  | "A_VS_B"
  | "RATING"
  | "EMOJI"
  | "PRICE"
  | "DECISION"
  | "PREDICTION";

export interface OptionShape {
  id: string;
  label: string;
  value?: string;
  imageUrl?: string | null;
  color?: string | null;
  voteCount?: number;
  sortOrder?: number;
}

export interface UserVoteShape {
  optionId?: string;
  ratingValue?: number;
  emojiValue?: string;
  priceValue?: number;
}

export interface VoteResultData {
  id: string;
  voteCount: number;
  controversyScore?: number;
  trendingScore?: number;
  viralityScore?: number;
  options: { id: string; voteCount: number }[];
}

export interface VoteButtonsProps {
  postId?: string;
  postType: PostType;
  options: OptionShape[];
  userVote?: UserVoteShape | null;
  disabled?: boolean;
  isClosed?: boolean;
  expiresAt?: Date | string | null;
  onVoteSubmitted?: (result: VoteResultData) => void;
  onVote?: (vote: UserVoteShape) => void;
  className?: string;
}

export type { AVersusBOption, PriceTier };

export const VoteButtons: React.FC<VoteButtonsProps> = ({
  postId,
  postType,
  options,
  userVote = null,
  disabled,
  isClosed,
  expiresAt,
  onVoteSubmitted,
  onVote,
  className,
}) => {
  const { data: session, status } = useSession();
  const { openLogin } = useLoginModal();
  const { show } = useToast();
  const utils = trpc.useUtils();
  const previewMode = !!onVote || !postId;

  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);
  const [selectedOptionId, setSelectedOptionId] = React.useState<string | null>(null);
  const [selectedRating, setSelectedRating] = React.useState<number | null>(null);
  const [selectedEmoji, setSelectedEmoji] = React.useState<string | null>(null);
  const [selectedPrice, setSelectedPrice] = React.useState<number | null>(null);
  const [successOptionId, setSuccessOptionId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const submitVoteMutation = trpc.voting.submitVote.useMutation({
    onSuccess: (data) => {
      if (data) {
        try {
          trackEvent("vote_completed", {
            postId,
            postType,
            voteCount: data.voteCount,
          });
        } catch {
        }
        show("Vote recorded!", "success");
        setSuccessOptionId(selectedOptionId);
        setTimeout(() => setSuccessOptionId(null), 1500);
        if (postId) {
          void utils.voting.getResults.invalidate({ id: postId });
          void utils.posts.getById.invalidate({ id: postId });
        }
        onVoteSubmitted?.(data as VoteResultData);
      }
    },
    onError: (error) => {
      setSelectedOptionId(null);
      setSelectedRating(null);
      setSelectedEmoji(null);
      setSelectedPrice(null);

      if (error.data?.code === "CONFLICT") {
        show("You already voted on this", "info");
        if (postId) {
          void utils.voting.getResults.invalidate({ id: postId });
          void utils.posts.getById.invalidate({ id: postId });
        }
      } else {
        show("Vote failed, please retry", "danger");
      }
    },
  });

  const isLoading = !previewMode && submitVoteMutation.isPending;
  const hasVoted = !!userVote;
  const isDisabled = disabled || isLoading || isClosed || hasVoted;
  const isUnauthenticated = !previewMode && status === "unauthenticated";

  const triggerLogin = (intentExtra: Partial<Extract<ReturnIntent, { type: "vote" }>> = {}) => {
    openLogin({
      type: "vote",
      postId: postId ?? "preview",
      ...intentExtra,
    });
  };

  const submitVote = (payload: {
    optionId?: string;
    ratingValue?: number;
    emojiValue?: string;
    priceValue?: number;
  }) => {
    if (previewMode) {
      if (isDisabled) return;
      onVote?.(payload as UserVoteShape);
      if (payload.optionId) {
        setSuccessOptionId(payload.optionId);
        setTimeout(() => setSuccessOptionId(null), 1500);
      }
      return;
    }
    if (isUnauthenticated) {
      triggerLogin(payload);
      return;
    }
    if (isDisabled || !postId) return;

    try {
      trackEvent("vote_started", {
        postId,
        postType,
        ...payload,
      });
    } catch {
    }

    submitVoteMutation.mutate({
      postId,
      ...payload,
    });
  };

  const handleOptionClick = (optionId: string) => {
    if (isDisabled) return;
    if (!previewMode && isUnauthenticated) {
      triggerLogin({ optionId });
      return;
    }
    setSelectedOptionId(optionId);
    submitVote({ optionId });
  };

  const handleRatingChange = (value: number) => {
    if (isDisabled) return;
    if (!previewMode && isUnauthenticated) {
      triggerLogin({ ratingValue: value });
      return;
    }
    setSelectedRating(value);
    submitVote({ ratingValue: value });
  };

  const handleEmojiSelect = (emoji: string) => {
    if (isDisabled) return;
    if (!previewMode && isUnauthenticated) {
      triggerLogin({ emojiValue: emoji });
      return;
    }
    setSelectedEmoji(emoji);
    submitVote({ emojiValue: emoji });
  };

  const handlePriceSelect = (tier: PriceTier) => {
    if (isDisabled) return;
    if (!previewMode && isUnauthenticated) {
      triggerLogin({ priceValue: tier.value });
      return;
    }
    setSelectedPrice(tier.value);
    submitVote({ priceValue: tier.value });
  };

  const getEffectiveSelectedOption = () => {
    if (selectedOptionId) return selectedOptionId;
    if (userVote?.optionId) return userVote.optionId;
    return null;
  };

  const renderPredictionBadge = () => {
    if (postType !== "PREDICTION") return null;
    return (
      <div className="flex items-center justify-between mb-3">
        <Badge variant="info" size="sm">
          <Clock className="w-3 h-3 mr-1 inline" />
          Prediction
        </Badge>
        {expiresAt && !isClosed && (
          <span className="text-xs text-muted-foreground">
            Closes {formatRelativeTime(expiresAt)}
          </span>
        )}
      </div>
    );
  };

  const renderClosedBadge = () => {
    if (!isClosed) return null;
    return (
      <div className="mb-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted border border-border">
        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold text-muted-foreground">Voting Closed</span>
      </div>
    );
  };

  const effSelectedOption = getEffectiveSelectedOption();

  const renderYesNo = () => {
    const optYes = options.find((o) => o.value === "YES" || o.label.toLowerCase() === "yes") || options[0];
    const optNo = options.find((o) => o.value === "NO" || o.label.toLowerCase() === "no") || options[1];
    const yesSelected = effSelectedOption === optYes?.id;
    const noSelected = effSelectedOption === optNo?.id;
    const yesSuccess = successOptionId === optYes?.id;
    const noSuccess = successOptionId === optNo?.id;

    return (
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled={isDisabled}
          onClick={() => optYes && handleOptionClick(optYes.id)}
          className={cn(
            "relative flex items-center justify-center gap-2 h-16 rounded-2xl font-black text-2xl",
            "bg-gradient-to-br from-emerald-500/90 to-green-600 text-white",
            "shadow-lg shadow-emerald-500/20",
            "transition-all duration-200",
            yesSelected && "ring-2 ring-emerald-300 ring-inset shadow-inner",
            isDisabled ? "opacity-50 cursor-not-allowed" : "hover:scale-[1.05] active:scale-[0.98] hover:shadow-xl hover:shadow-emerald-500/30"
          )}
        >
          <ThumbsUp className="w-7 h-7" />
          <span className="tracking-wide">YES</span>
          {isLoading && selectedOptionId === optYes?.id && (
            <div className="absolute inset-0 rounded-2xl bg-white/20 animate-pulse" />
          )}
          {yesSuccess && (
            <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/90 text-emerald-600 flex items-center justify-center animate-[scale-in_0.3s_ease-out]">
              <Check className="w-4 h-4" strokeWidth={3} />
            </div>
          )}
        </button>
        <button
          type="button"
          disabled={isDisabled}
          onClick={() => optNo && handleOptionClick(optNo.id)}
          className={cn(
            "relative flex items-center justify-center gap-2 h-16 rounded-2xl font-black text-2xl",
            "bg-gradient-to-br from-rose-500/90 to-red-600 text-white",
            "shadow-lg shadow-rose-500/20",
            "transition-all duration-200",
            noSelected && "ring-2 ring-rose-300 ring-inset shadow-inner",
            isDisabled ? "opacity-50 cursor-not-allowed" : "hover:scale-[1.05] active:scale-[0.98] hover:shadow-xl hover:shadow-rose-500/30"
          )}
        >
          <ThumbsDown className="w-7 h-7" />
          <span className="tracking-wide">NO</span>
          {isLoading && selectedOptionId === optNo?.id && (
            <div className="absolute inset-0 rounded-2xl bg-white/20 animate-pulse" />
          )}
          {noSuccess && (
            <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/90 text-rose-600 flex items-center justify-center animate-[scale-in_0.3s_ease-out]">
              <Check className="w-4 h-4" strokeWidth={3} />
            </div>
          )}
        </button>
      </div>
    );
  };

  const renderMultipleChoice = () => {
    return (
      <div className="flex flex-col gap-2.5">
        {options.map((opt, idx) => {
          const isSelected = effSelectedOption === opt.id;
          const isSuccess = successOptionId === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              disabled={isDisabled}
              onClick={() => handleOptionClick(opt.id)}
              className={cn(
                "relative flex items-center gap-3 px-4 py-3.5 rounded-xl text-left font-semibold",
                "border-2 transition-all duration-200",
                postType === "POLL" && "rounded-2xl",
                isDisabled && "opacity-60 cursor-not-allowed",
                !isDisabled && "hover:border-primary/50 hover:bg-primary/5 active:scale-[0.99]",
                isSelected
                  ? "border-primary bg-primary/10 text-primary shadow-md ring-2 ring-primary/30 ring-inset"
                  : "border-border bg-muted/30"
              )}
            >
              <span
                className={cn(
                  "w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 text-xs font-bold transition-colors",
                  isSelected
                    ? "bg-primary border-primary text-primary-foreground"
                    : "border-muted-foreground/30 text-muted-foreground"
                )}
              >
                {String.fromCharCode(65 + idx)}
              </span>
              <span className="flex-1 truncate">{opt.label}</span>
              {isSuccess && (
                <div className="w-6 h-6 rounded-full bg-success flex items-center justify-center flex-shrink-0 animate-[scale-in_0.3s_ease-out]">
                  <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                </div>
              )}
              {isSelected && !isSuccess && (
                <div className="w-5 h-5 rounded-full bg-success flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-white" strokeWidth={3} />
                </div>
              )}
            </button>
          );
        })}
      </div>
    );
  };

  const renderAVersusB = () => {
    const optA: AVersusBOption | undefined = options[0];
    const optB: AVersusBOption | undefined = options[1];
    if (!optA || !optB) return null;
    return (
      <AVersusB
        optionA={optA}
        optionB={optB}
        selectedId={effSelectedOption}
        onSelect={handleOptionClick}
        disabled={isDisabled}
      />
    );
  };

  const renderRating = () => {
    const maxVal = options.length > 0 ? Math.min(options.length, 10) : 10;
    const effRating = selectedRating ?? userVote?.ratingValue ?? null;
    return (
      <div className="flex justify-center py-2">
        <RatingSlider
          mode="numbers"
          max={maxVal}
          value={effRating}
          onChange={handleRatingChange}
          disabled={isDisabled}
        />
      </div>
    );
  };

  const renderEmoji = () => {
    const emojis = options.map((o) => o.label || o.value || "");
    const effEmoji = selectedEmoji ?? userVote?.emojiValue ?? null;
    return (
      <EmojiPicker
        emojis={emojis.length >= 2 ? emojis : undefined}
        selected={effEmoji}
        onSelect={handleEmojiSelect}
        disabled={isDisabled}
      />
    );
  };

  const renderPrice = () => {
    const tiers: PriceTier[] = options.map((o, idx) => ({
      id: o.id,
      value: Number(o.value) || Number(o.label) || (idx + 1) * 1000,
      label: o.label !== o.value ? o.label : undefined,
    }));
    const effPrice = selectedPrice ?? userVote?.priceValue ?? null;
    return (
      <PriceTiers
        tiers={tiers.length >= 2 ? tiers : undefined}
        selectedValue={effPrice}
        onSelect={handlePriceSelect}
        disabled={isDisabled}
      />
    );
  };

  const renderDecision = () => {
    const doIt = options.find((o) => o.value === "DO_IT" || o.label.toLowerCase().includes("do it")) || options[0];
    const dontDoIt = options.find((o) => o.value === "DONT_DOIT" || o.label.toLowerCase().includes("don")) || options[1];
    const notSure = options.find((o) => o.value === "NOT_SURE" || o.label.toLowerCase().includes("sure")) || options[2];
    const doSelected = effSelectedOption === doIt?.id;
    const dontSelected = effSelectedOption === dontDoIt?.id;
    const nsSelected = effSelectedOption === notSure?.id;
    const doSuccess = successOptionId === doIt?.id;
    const dontSuccess = successOptionId === dontDoIt?.id;
    const nsSuccess = successOptionId === notSure?.id;

    return (
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          disabled={isDisabled}
          onClick={() => doIt && handleOptionClick(doIt.id)}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 h-14 rounded-2xl font-bold text-lg relative",
            "bg-gradient-to-br from-emerald-500/90 to-green-600 text-white",
            "shadow-lg shadow-emerald-500/20",
            "transition-all duration-200",
            doSelected && "ring-2 ring-emerald-300 ring-inset shadow-inner",
            isDisabled ? "opacity-50 cursor-not-allowed" : "hover:scale-[1.02] active:scale-[0.98]"
          )}
        >
          <ThumbsUp className="w-5 h-5" />
          DO IT
          {doSuccess && (
            <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-white/90 text-emerald-600 flex items-center justify-center animate-[scale-in_0.3s_ease-out]">
              <Check className="w-3 h-3" strokeWidth={3} />
            </div>
          )}
        </button>
        <button
          type="button"
          disabled={isDisabled}
          onClick={() => dontDoIt && handleOptionClick(dontDoIt.id)}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 h-14 rounded-2xl font-bold text-lg relative",
            "bg-gradient-to-br from-rose-500/90 to-red-600 text-white",
            "shadow-lg shadow-rose-500/20",
            "transition-all duration-200",
            dontSelected && "ring-2 ring-rose-300 ring-inset shadow-inner",
            isDisabled ? "opacity-50 cursor-not-allowed" : "hover:scale-[1.02] active:scale-[0.98]"
          )}
        >
          <ThumbsDown className="w-5 h-5" />
          DON&apos;T DO IT
          {dontSuccess && (
            <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-white/90 text-rose-600 flex items-center justify-center animate-[scale-in_0.3s_ease-out]">
              <Check className="w-3 h-3" strokeWidth={3} />
            </div>
          )}
        </button>
        {notSure && (
          <button
            type="button"
            disabled={isDisabled}
            onClick={() => notSure && handleOptionClick(notSure.id)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 h-14 rounded-2xl font-bold text-lg relative",
              "bg-muted text-foreground border-2 border-border",
              "transition-all duration-200",
              nsSelected && "ring-2 ring-muted-foreground/50 ring-inset shadow-inner border-muted-foreground/50",
              isDisabled ? "opacity-50 cursor-not-allowed" : "hover:scale-[1.02] active:scale-[0.98] hover:bg-muted/80"
            )}
          >
            🤔 NOT SURE
            {nsSuccess && (
              <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-success flex items-center justify-center animate-[scale-in_0.3s_ease-out]">
                <Check className="w-3 h-3 text-white" strokeWidth={3} />
              </div>
            )}
          </button>
        )}
      </div>
    );
  };

  let content: React.ReactNode = null;
  switch (postType) {
    case "YES_NO":
    case "PREDICTION":
      content = renderYesNo();
      break;
    case "MULTIPLE_CHOICE":
    case "POLL":
      content = renderMultipleChoice();
      break;
    case "A_VS_B":
      content = renderAVersusB();
      break;
    case "RATING":
      content = renderRating();
      break;
    case "EMOJI":
      content = renderEmoji();
      break;
    case "PRICE":
      content = renderPrice();
      break;
    case "DECISION":
      content = renderDecision();
      break;
    default:
      content = renderMultipleChoice();
  }

  return (
    <div className={cn("w-full", className)}>
      {renderClosedBadge()}
      {renderPredictionBadge()}
      {content}
    </div>
  );
};
