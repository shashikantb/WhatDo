"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/design-system/Button";
import { ProgressBar } from "@/components/design-system/ProgressBar";
import {
  AssessmentQuestionCard,
  RareAnswerBanner,
  type AssessmentQuestionT,
} from "@/components/whatdo/AssessmentQuestionCard";
import { trpc } from "@/lib/trpc/client";
import { ArrowLeft, ArrowRight, Loader2, Lock, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLoginModal } from "@/components/auth/LoginModal";
import { useSession } from "next-auth/react";
import { CITY_NORMALIZATIONS } from "../page";

function normalizeCityName(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const clean = String(raw).trim().toLowerCase().replace(/\s+/g, " ");
  if (!clean) return null;
  if (CITY_NORMALIZATIONS[clean]) return CITY_NORMALIZATIONS[clean]!;
  const rawClean = String(raw).trim().replace(/\s+/g, " ");
  return rawClean.replace(/\b\w/g, (c) => c.toUpperCase());
}

const TARGET_COUNT = 12;
const MIN_TO_COMPUTE = 10;

export default function WhatDoQuizPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { openLogin, setReturnIntent } = useLoginModal();
  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [city, setCity] = React.useState<string | null>(null);
  const [answered, setAnswered] = React.useState<
    { qid: string; optionId: string; submitted: boolean; pct?: number | null; rare?: boolean; vrare?: boolean; agreement?: number | null }[]
  >([]);
  const [selectedOptionId, setSelectedOptionId] = React.useState<string | null>(null);
  const [showFeedback, setShowFeedback] = React.useState(false);
  const [submitBusy, setSubmitBusy] = React.useState(false);
  const [calcBusy, setCalcBusy] = React.useState(false);

  React.useEffect(() => {
    try {
      const s = window.localStorage.getItem("whatdo_sess");
      if (s) setSessionId(s);
      const c = window.localStorage.getItem("whatdo_city");
      if (c) {
        const normalized = normalizeCityName(c);
        if (normalized) {
          setCity(normalized);
          if (normalized !== c) {
            try { window.localStorage.setItem("whatdo_city", normalized); } catch {}
          }
        }
      }
    } catch {
    }
  }, []);

  const answeredIds = answered.map((a) => a.qid);

  const nextQ = trpc.whatdo.nextQuestion.useQuery(
    {
      sessionId: sessionId ?? "boot",
      answeredQuestionIds: answeredIds,
      city,
      targetQuestionCount: TARGET_COUNT,
    },
    {
      enabled: !!sessionId,
      staleTime: 0,
      refetchOnMount: true,
    },
  );
  const submit = trpc.whatdo.submitAnswer.useMutation();
  const calc = trpc.whatdo.calculateResult.useMutation();
  const revealAfter = trpc.whatdo.revealAfterLogin.useMutation();

  const q: AssessmentQuestionT | null = nextQ.data?.question as any;
  const progressDone = answered.length;
  const progressTotal = nextQ.data?.progress.total ?? TARGET_COUNT;

  const allAnswered = progressDone >= progressTotal;
  const needTwoMore = progressDone < progressTotal - 2;
  const questionNumberForHeader = Math.min(progressDone + (q ? 1 : 0), progressTotal);

  const handleNext = async () => {
    if (!selectedOptionId || !q || !sessionId) return;
    if (allAnswered) return;
    setSubmitBusy(true);
    try {
      await submit.mutateAsync({
        sessionId,
        questionId: q.id,
        optionId: selectedOptionId,
        citySnapshot: city ?? undefined,
      });
      setAnswered((prev) => [
        ...prev,
        { qid: q.id, optionId: selectedOptionId, submitted: true },
      ]);
      setShowFeedback(true);
      setTimeout(() => {
        setShowFeedback(false);
        setSelectedOptionId(null);
      }, 1200);
    } finally {
      setSubmitBusy(false);
    }
  };

  const handleCompute = async (requireLogin: boolean) => {
    if (!sessionId) return;
    if (status !== "authenticated") {
      setReturnIntent({
        type: "whatdo_reveal",
        sessionId,
        minQuestions: MIN_TO_COMPUTE,
      } as any);
      openLogin(undefined, "register");
      return;
    }
    setCalcBusy(true);
    try {
      const r = await calc.mutateAsync({
        sessionId,
        minQuestions: MIN_TO_COMPUTE,
      });
      if (status === "authenticated" && sessionId) {
        await revealAfter.mutateAsync({ sessionId }).catch(() => {});
      }
      if (r.computed && r.identityId) {
        try { window.sessionStorage.setItem("whatdo_last_identity", r.identityId); } catch {}
      }
      const dest = new URLSearchParams();
      if (r.computed && r.identityId) dest.set("id", r.identityId);
      router.push(dest.toString() ? `/whatdo/result?${dest.toString()}` : "/whatdo/result");
    } finally {
      setCalcBusy(false);
    }
  };

  const progressPct = Math.min(100, (Math.min(progressDone, progressTotal) / progressTotal) * 100);
  const canFinish = progressDone >= MIN_TO_COMPUTE;
  const isAnon = status !== "authenticated";
  const canFinishWithLogin = canFinish && isAnon;

  const onPrimaryClick = () => {
    if (allAnswered) {
      handleCompute(false);
    } else {
      handleNext();
    }
  };

  return (
    <main className="min-h-[100dvh] w-full bg-gradient-to-b from-slate-950 via-indigo-950 to-fuchsia-950 text-white">
      <div className="mx-auto w-full max-w-xl px-4 py-6 md:py-10">
        <div className="flex items-center justify-between">
          <Link
            href="/whatdo"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-white/85 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-white/80">
            <span>Question {questionNumberForHeader} / {progressTotal}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              if (canFinish) handleCompute(false);
              else router.push("/");
            }}
            className="text-[11.5px] font-bold text-white/70 hover:text-white transition-colors"
          >
            {canFinish ? "Finish early" : <X className="h-4 w-4" />}
          </button>
        </div>

        <div className="mt-3 mb-7">
          <ProgressBar value={progressPct} className="h-1.5 w-full bg-white/10" />
          <div className="mt-2 flex items-center justify-center gap-1.5">
            {Array.from({ length: progressTotal }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-2 w-2 rounded-full transition-all",
                  i < progressDone
                    ? "bg-gradient-to-br from-emerald-400 to-teal-400 scale-100"
                    : i === progressDone && !allAnswered
                      ? "bg-fuchsia-400 scale-125 shadow-[0_0_10px_theme(colors.fuchsia.400)]"
                      : "bg-white/15",
                )}
              />
            ))}
          </div>
        </div>

        <div className="min-h-[58vh] flex flex-col gap-4">
          {!sessionId && (
            <div className="mx-auto w-full max-w-lg rounded-3xl border border-white/10 bg-white/5 p-6 text-center space-y-3">
              <p className="text-sm text-white/80 font-semibold">
                Restoring your session…
              </p>
              <p className="text-xs text-white/60">
                If nothing loads, please return to the{" "}
                <Link href="/whatdo" className="underline font-bold">
                  WhatDo landing page
                </Link>{" "}
                and tap Start Quiz.
              </p>
            </div>
          )}

          {sessionId && nextQ.isFetching && !q && !allAnswered && (
            <div className="mx-auto w-full max-w-lg rounded-3xl border border-white/10 bg-white/5 p-6 text-center">
              <Loader2 className="h-5 w-5 animate-spin text-fuchsia-300 mx-auto mb-2" />
              <p className="text-xs text-white/70 font-semibold">
                Picking the next best question for you…
              </p>
            </div>
          )}

          {sessionId && q && !allAnswered && (
            <div className="space-y-4 transition-opacity">
              <AssessmentQuestionCard
                key={q.id}
                question={q}
                selectedOptionId={selectedOptionId}
                onSelect={(id) => setSelectedOptionId(id)}
                disabled={submitBusy}
              />

              {showFeedback && (
                <RareAnswerBanner
                  agreementPct={null}
                  rarityPct={null}
                  isRare={false}
                  isVeryRare={false}
                />
              )}

              <div className="flex items-center justify-between gap-2">
                <div className="text-[11.5px] text-white/70 font-semibold">
                  {!needTwoMore && !allAnswered && (
                    <span className="inline-flex items-center gap-1.5 text-emerald-300">
                      🎉 Almost done — answer {progressTotal - progressDone} more to unlock your result.
                    </span>
                  )}
                </div>
                <Button
                  size="lg"
                  onClick={onPrimaryClick}
                  disabled={
                    allAnswered
                      ? submitBusy || calcBusy
                      : !selectedOptionId || submitBusy
                  }
                  rightIcon={submitBusy ? undefined : <ArrowRight className="h-5 w-5" />}
                  className="rounded-full px-6 py-3.5 text-base shadow-xl shadow-black/30 bg-white text-black hover:bg-white/95 border-0"
                >
                  {submitBusy ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                    </>
                  ) : progressDone + 1 >= progressTotal ? (
                    "See my result"
                  ) : (
                    "Next →"
                  )}
                </Button>
              </div>
            </div>
          )}

          {(allAnswered || (sessionId && !nextQ.isFetching && !q)) && (
            <div className="mx-auto w-full max-w-lg rounded-3xl border border-white/10 bg-white/5 p-6 space-y-4 text-center">
              <p className="text-lg font-black">All {progressTotal} questions complete!</p>
              {isAnon ? (
                <>
                  <div className="rounded-2xl border border-fuchsia-400/20 bg-gradient-to-br from-fuchsia-500/10 via-violet-500/5 to-indigo-500/10 p-4 text-left space-y-2">
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5 h-8 w-8 shrink-0 rounded-xl bg-gradient-to-br from-fuchsia-400 to-pink-500 flex items-center justify-center shadow-lg shadow-fuchsia-500/30">
                        <Lock className="h-4 w-4 text-white" />
                      </div>
                      <div className="space-y-0.5 min-w-0">
                        <p className="text-sm font-black text-white leading-tight">
                          One last step → register to reveal your WhatDo Type
                        </p>
                        <p className="text-[11.5px] text-fuchsia-100/90 leading-relaxed">
                          Upload a profile photo now and it will appear on your 6 share-card designs. We auto-save all 12 answers you just picked to your new account.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-2.5 pt-1">
                    <Button
                      size="lg"
                      onClick={() => handleCompute(false)}
                      disabled={!canFinish || calcBusy}
                      rightIcon={calcBusy ? undefined : <ArrowRight className="h-5 w-5" />}
                      className="rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-500 text-white hover:from-fuchsia-500/90 hover:to-violet-500/90 border-0 shadow-xl shadow-fuchsia-500/30"
                    >
                      {calcBusy ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> Preparing your result…
                        </>
                      ) : (
                        <>Create account + see my WhatDo Type</>
                      )}
                    </Button>
                    <p className="text-[11px] text-white/60 -mt-1">
                      Already have an account? The login tab works too — your answers are still there.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-white/75">
                    You answered <b className="text-white">{progressDone}</b>{" "}
                    {progressDone === 1 ? "question" : "questions"}. You need at
                    least {MIN_TO_COMPUTE} to unlock your WhatDo Type.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                    <Button
                      size="lg"
                      onClick={() => handleCompute(false)}
                      disabled={!canFinish || calcBusy}
                      rightIcon={calcBusy ? undefined : <ArrowRight className="h-5 w-5" />}
                      className="rounded-full bg-white text-black hover:bg-white/95 border-0 shadow-lg"
                    >
                      {calcBusy ? "Computing…" : "See result"}
                    </Button>
                    {canFinishWithLogin && (
                      <Button
                        size="lg"
                        variant="outline"
                        onClick={() => handleCompute(true)}
                        className="rounded-full"
                      >
                        <Lock className="h-4 w-4 mr-1.5" />
                        Login to claim + share
                      </Button>
                    )}
                  </div>
                </>
              )}
              {!canFinish && (
                <p className="text-[11.5px] text-amber-200 font-semibold pt-1">
                  You need {MIN_TO_COMPUTE - progressDone} more answers before
                  the engine has enough data.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="mt-10 pt-4 border-t border-white/10 text-center text-[11px] text-white/55">
          Answers attributed to session. Login at end to merge + claim referral attribution.
        </div>
      </div>
    </main>
  );
}
