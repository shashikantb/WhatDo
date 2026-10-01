"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Sparkles, ChevronRight, BarChart3, Eye, Users } from "lucide-react";
import { Button } from "@/components/design-system/Button";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

function SessionIdStore() {
  React.useEffect(() => {
    try {
      const existing = window.localStorage.getItem("whatdo_sess");
      if (!existing) {
        const headerCookie = document.cookie
          .split(";")
          .map((s) => s.trim())
          .find((s) => s.startsWith("whatdo_sess="));
        if (headerCookie) {
          window.localStorage.setItem(
            "whatdo_sess",
            decodeURIComponent(headerCookie.split("=")[1] ?? ""),
          );
        }
      }
    } catch {
    }
  }, []);
  return null;
}

export function DailyWhatDoHero() {
  const { data: session } = useSession();
  const router = useRouter();
  const utils = trpc.useUtils();
  const trackLanding = trpc.whatdo.trackLanding.useMutation();
  const summary = trpc.adminQuestions.summaryStats.useQuery(undefined, {
    staleTime: 120_000,
    refetchOnMount: true,
  });
  const [localSessionId, setLocalSessionId] = React.useState<string | null>(null);
  React.useEffect(() => {
    try {
      const sid = window.localStorage.getItem("whatdo_sess");
      if (sid) setLocalSessionId(sid);
    } catch {}
  }, []);
  const existingIdentity = trpc.whatdo.getIdentity.useQuery(
    { identityId: undefined, sessionId: localSessionId ?? undefined },
    {
      enabled: !!session?.user || !!localSessionId,
      staleTime: 180_000,
    },
  );
  const trackRefCookie = React.useCallback(() => {
    try {
      const refMatch = document.cookie
        .split(";")
        .map((s) => s.trim())
        .find((s) => s.startsWith("whatdo_ref="));
      if (refMatch) {
        const token = decodeURIComponent(refMatch.split("=")[1] ?? "");
        if (token && !window.localStorage.getItem("ref_tracked_" + token)) {
          void utils.client.whatdo.trackShareClick
            .mutate({ shareToken: token, event: "CLICK" })
            .then(() => {
              window.localStorage.setItem("ref_tracked_" + token, "1");
            })
            .catch(() => {});
        }
      }
    } catch {
    }
  }, [utils]);
  React.useEffect(() => {
    trackRefCookie();
  }, [trackRefCookie]);

  const handleStart = async () => {
    let sid = null;
    try {
      sid = window.localStorage.getItem("whatdo_sess");
    } catch {
    }
    const resp = await trackLanding.mutateAsync({
      sessionId: sid ?? undefined,
    });
    if (resp?.sessionId) {
      try {
        window.localStorage.setItem("whatdo_sess", resp.sessionId);
      } catch {
      }
      document.cookie =
        "whatdo_sess=" +
        encodeURIComponent(resp.sessionId) +
        "; path=/; max-age=" +
        14 * 24 * 60 * 60 +
        (window.location.protocol === "https:" ? "; secure" : "") +
        "; SameSite=Lax";
    }
    router.push("/whatdo");
  };

  const identities = summary.data?.identities ?? 0;
  const publishedQuestions = summary.data?.publishedQuestions ?? 0;

  return (
    <>
      <SessionIdStore />
      <section className="snap-start snap-always w-full relative overflow-hidden h-[100dvh] flex items-center justify-center">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#a855f7_0%,_#6366f1_28%,_#0ea5e9_60%,_#020617_100%)]" />
        <div className="absolute inset-0 opacity-[0.18] mix-blend-overlay [background-image:radial-gradient(#ffffff_1px,transparent_1px)] [background-size:20px_20px]" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black via-black/60 to-transparent" />

        <div className="relative z-10 w-full max-w-md px-6 pt-16 pb-24 text-center">
          <div className="mx-auto mb-6 inline-flex items-center gap-1.5 rounded-full bg-white/15 border border-white/20 backdrop-blur-md px-3.5 py-1.5 shadow-xl shadow-black/20">
            <Sparkles className="h-3.5 w-3.5 text-fuchsia-300" />
            <span className="text-[11px] font-bold tracking-wide text-white/95 uppercase">
              Daily WhatDo · 2 min quiz
            </span>
          </div>

          <h1 className="text-[2.35rem] sm:text-[2.75rem] font-black leading-[1.02] tracking-tight text-white drop-shadow-2xl">
            What kind of
            <span className="block bg-gradient-to-r from-fuchsia-200 via-white to-amber-200 bg-clip-text text-transparent">
              WhatDo-er are you?
            </span>
          </h1>

          <p className="mt-4 text-[15px] leading-relaxed text-white/90 font-medium max-w-[22rem] mx-auto">
            Answer 12 real questions from people in your city. Get your
            WhatDo Type, rare answer badge, and a share card your friends
            will actually click.
          </p>

          <div className="mt-7 grid grid-cols-3 gap-2.5 max-w-[22rem] mx-auto">
            <div className="rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md px-3 py-3 text-left">
              <Eye className="h-4 w-4 text-white/80 mb-1.5" />
              <p className="text-[11px] uppercase font-bold tracking-wide text-white/70">
                Real %
              </p>
              <p className="text-sm font-black text-white">Not guessed</p>
            </div>
            <div className="rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md px-3 py-3 text-left">
              <BarChart3 className="h-4 w-4 text-white/80 mb-1.5" />
              <p className="text-[11px] uppercase font-bold tracking-wide text-white/70">
                City compare
              </p>
              <p className="text-sm font-black text-white">Your cohort</p>
            </div>
            <div className="rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md px-3 py-3 text-left">
              <Users className="h-4 w-4 text-white/80 mb-1.5" />
              <p className="text-[11px] uppercase font-bold tracking-wide text-white/70">
                Viral cards
              </p>
              <p className="text-sm font-black text-white">6 templates</p>
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center gap-3">
            {existingIdentity.data?.whatdoType ? (
              <>
                <Button
                  size="lg"
                  onClick={() => router.push("/whatdo/result")}
                  rightIcon={<ChevronRight className="h-5 w-5" />}
                  className="w-full max-w-xs rounded-full px-6 py-3.5 text-base bg-white text-black border-0 shadow-2xl shadow-black/30 hover:bg-white/95"
                >
                  See your WhatDo result
                </Button>
                <Button
                  size="md"
                  variant="ghost"
                  onClick={handleStart}
                  className="w-full max-w-xs rounded-full text-white/90 hover:bg-white/10 border border-white/15"
                >
                  Re-take quiz (overwrite current)
                </Button>
                <p className="pt-1 text-[11px] text-white/70 font-medium">
                  Your type:{" "}
                  <span className="font-bold text-white/95 uppercase tracking-wide">
                    {String(
                      existingIdentity.data.whatdoType,
                    ).replaceAll("_", " ")}
                  </span>
                </p>
              </>
            ) : (
              <Button
                size="lg"
                onClick={handleStart}
                rightIcon={<ChevronRight className="h-5 w-5" />}
                className="w-full max-w-xs rounded-full px-6 py-3.5 text-base bg-white text-black border-0 shadow-2xl shadow-black/30 hover:bg-white/95"
              >
                Take the WhatDo Quiz
              </Button>
            )}
          </div>

          <div className="mt-9 flex items-center justify-center gap-4 text-[11.5px] font-semibold text-white/80">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_theme(colors.emerald.400)] animate-pulse" />
              {identities.toLocaleString()} people typed
            </span>
            <span className="h-3 w-px bg-white/25" />
            <span>{publishedQuestions} live questions</span>
            <span className="h-3 w-px bg-white/25" />
            <Link
              href="/whatdo"
              className={cn(
                "underline decoration-dotted underline-offset-4 hover:text-white transition-colors",
              )}
            >
              Learn more
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
