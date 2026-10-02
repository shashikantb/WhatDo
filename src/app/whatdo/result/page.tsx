"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  drawShareCard,
  CARD_W,
  CARD_H,
  type ShareCardResultSnapshot,
} from "@/lib/whatdo/share-canvas";
import type { WhatDoCardTemplate } from "@/lib/whatdo/ai-prompt";
import { CARD_TEMPLATES } from "@/lib/whatdo/ai-prompt";
import { getArchetypeDefinition } from "@/lib/whatdo/archetypes";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/design-system/Button";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Eye,
  ImageIcon,
  Lock,
  MessageCircle,
  Share2,
  Trophy,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLoginModal } from "@/components/auth/LoginModal";
import { ProgressBar } from "@/components/design-system/ProgressBar";
import { loadAvatarImage } from "@/lib/whatdo/share-canvas";

function usePersistedWhatdoArgs() {
  const params = useSearchParams();
  const fromQuery = params?.get("id");
  const [state, setState] = React.useState<{ identityId?: string; sessionId?: string }>({});
  React.useEffect(() => {
    let identityId: string | undefined = fromQuery ?? undefined;
    let sessionId: string | undefined;
    try {
      sessionId = window.localStorage.getItem("whatdo_sess") ?? undefined;
    } catch {
      sessionId = undefined;
    }
    if (!identityId) {
      try {
        const cached = window.sessionStorage.getItem("whatdo_last_identity");
        if (cached) identityId = cached;
      } catch {}
    }
    setState({ identityId, sessionId });
  }, [fromQuery]);
  return state;
}

export default function WhatDoResultPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { openLogin } = useLoginModal();
  const isLoggedIn = status === "authenticated";
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const [templateIdx, setTemplateIdx] = React.useState(1);
  const [copied, setCopied] = React.useState<"link" | "prompt" | null>(null);
  const [shareToken, setShareToken] = React.useState<string | null>(null);
  const persisted = usePersistedWhatdoArgs();

  const identity = trpc.whatdo.getIdentity.useQuery(
    {
      identityId: persisted.identityId,
      sessionId: persisted.sessionId,
    },
    { staleTime: 30_000, enabled: !!(persisted.identityId || persisted.sessionId || isLoggedIn) }
  );
  const me = trpc.auth.me.useQuery(undefined, { staleTime: 60_000, enabled: isLoggedIn });
  const calc = trpc.whatdo.calculateResult.useMutation();
  const utils = trpc.useUtils();
  const genToken = trpc.whatdo.generateShareToken.useMutation();
  const genPrompt = trpc.whatdo.generateAIPrompt.useQuery(
    { template: (CARD_TEMPLATES[templateIdx] as WhatDoCardTemplate), identityId: identity.data?.id ?? undefined },
    { enabled: !!identity.data?.id, staleTime: 60_000 }
  );

  const trackClick = trpc.whatdo.trackShareClick.useMutation();

  const user = session?.user as any;
  const rawIdentity = identity.data as any;
  const id: any = rawIdentity;

  React.useEffect(() => {
    if (!persisted.sessionId || id || identity.isFetching || identity.isLoading) return;
    if (calc.isPending || calc.isSuccess) return;
    const computeSafe = async () => {
      try {
        const r = await calc.mutateAsync({ sessionId: persisted.sessionId!, minQuestions: 10 });
        if (r.computed && r.identityId) {
          try { window.sessionStorage.setItem("whatdo_last_identity", r.identityId); } catch {}
          await utils.whatdo.getIdentity.invalidate({
            identityId: r.identityId,
            sessionId: persisted.sessionId,
          });
          const dest = new URLSearchParams({ id: r.identityId });
          window.history.replaceState(null, "", `${location.pathname}?${dest.toString()}`);
        }
      } catch {
      }
    };
    void computeSafe();
  }, [persisted.sessionId, id, identity.isFetching, identity.isLoading, calc.isPending, calc.isSuccess, utils.whatdo.getIdentity]);

  const manualCompute = async () => {
    if (!persisted.sessionId || !isLoggedIn) {
      if (isLoggedIn) return;
    }
    const sid = persisted.sessionId;
    if (!sid) {
      router.push("/whatdo/quiz");
      return;
    }
    try {
      const r = await calc.mutateAsync({ sessionId: sid, minQuestions: 10 });
      if (r.computed && r.identityId) {
        try { window.sessionStorage.setItem("whatdo_last_identity", r.identityId); } catch {}
        await utils.whatdo.getIdentity.invalidate({
          identityId: r.identityId,
          sessionId: persisted.sessionId,
        });
        const dest = new URLSearchParams({ id: r.identityId });
        router.replace(`/whatdo/result?${dest.toString()}`);
      } else if (r.reason) {
        router.push("/whatdo/quiz");
      }
    } catch {
      router.push("/whatdo/quiz");
    }
  };
  const snapshot: ShareCardResultSnapshot | null = id
    ? {
        displayName: (me.data?.displayName ?? user?.displayName ?? user?.name ?? null) as any,
        username: (me.data?.username ?? user?.username ?? null) as any,
        avatarUrl: (me.data?.avatarUrl ?? user?.avatarUrl ?? user?.image ?? null) as any,
        archetype: id.whatdoType as any,
        agreementPct: id.agreementPct ?? null,
        rarityPct: id.rarityPct ?? null,
        strongestTrait: id.strongestTrait ?? "—",
        signalScores: id.signalScores ?? {
          CURIOSITY: 50,
          RISK_TAKING: 50,
          CREATIVITY: 50,
          SOCIAL: 50,
          INDEPENDENCE: 50,
        },
        citySnapshot: id.citySnapshot ?? null,
        cityAlignmentPct: id.cityAlignmentPct ?? null,
        veryRareAnswersCount: 0,
        rareAnswersCount: 0,
        totalQuestions: id.totalQuestions ?? 0,
        shareToken: null,
        identityId: id.id,
      }
    : null;

  const [avatarImg, setAvatarImg] = React.useState<HTMLImageElement | null>(null);
  React.useEffect(() => {
    let cancelled = false;
    const src = snapshot?.avatarUrl ?? null;
    setAvatarImg(null);
    if (!src) return;
    void (async () => {
      const img = await loadAvatarImage(src);
      if (!cancelled) setAvatarImg(img);
    })();
    return () => {
      cancelled = true;
    };
  }, [snapshot?.avatarUrl]);

  React.useEffect(() => {
    if (isLoggedIn && id && !shareToken && !genToken.isPending) {
      const p = genToken.mutateAsync({});
      p.then((r) => {
        setShareToken(r.shareToken);
      }).catch(() => {});
    }
  }, [isLoggedIn, id, shareToken, genToken.isPending]);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !snapshot) return;
    canvas.width = CARD_W;
    canvas.height = CARD_H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const tpl = CARD_TEMPLATES[templateIdx] as WhatDoCardTemplate;
    drawShareCard(ctx, tpl, { ...snapshot, shareToken }, { avatarImg });
  }, [snapshot, templateIdx, shareToken, avatarImg]);

  if (identity.isFetching && !identity.data) {
    return (
      <main className="min-h-[100dvh] bg-slate-950 text-white flex items-center justify-center px-5">
        <div className="text-center space-y-3">
          <p className="text-sm text-white/70 font-semibold animate-pulse">
            Loading your WhatDo Type…
          </p>
          <ProgressBar value={55} className="h-1.5 w-64 mx-auto bg-white/10" />
          <p className="text-xs text-white/50">
            If nothing loads, go to <Link href="/whatdo/quiz" className="underline font-bold">take the quiz</Link>.
          </p>
        </div>
      </main>
    );
  }

  if (!snapshot) {
    return (
      <main className="min-h-[100dvh] bg-slate-950 text-white">
        <div className="mx-auto max-w-md px-5 py-12 text-center space-y-5">
        <Trophy className={cn("h-10 w-10 text-amber-300 mx-auto", calc.isPending && "animate-pulse opacity-70")} />
        <h1 className="text-2xl font-black tracking-tight">
          {calc.isPending ? "Computing your WhatDo Type…" : "No WhatDo Type yet"}
        </h1>
        <p className="text-sm text-white/70">
          {calc.isPending
            ? "Running the archetype classifier against your 12 answers. This takes ~5 seconds."
            : persisted.sessionId
              ? "We couldn't find a computed result for your session. If you've already answered 10+ questions, press Retry compute below."
              : "Answer 10+ questions to unlock your result and generate your share cards."}
        </p>
        <div className="w-full max-w-[240px] mx-auto">
          <ProgressBar
            value={calc.isPending ? 65 : 0}
            className={cn("h-1.5 bg-white/10", !calc.isPending && "opacity-30")}
          />
        </div>
        <div className="flex flex-col items-center gap-2 pt-2">
          {persisted.sessionId ? (
            <>
              <Button
                size="lg"
                onClick={manualCompute}
                disabled={calc.isPending}
              >
                {calc.isPending ? (
                  <><Eye className="h-4 w-4 mr-1.5 animate-pulse" /> Computing…</>
                ) : (
                  <>Retry compute my result</>
                )}
              </Button>
              <Button size="md" variant="outline" onClick={() => router.push("/whatdo/quiz")}>
                Go back to Quiz
              </Button>
            </>
          ) : (
            <>
              <Button size="lg" onClick={() => router.push("/whatdo/quiz")}>
                Go to Quiz
              </Button>
            </>
          )}
          <Button size="md" variant="ghost" onClick={() => router.push("/")}>
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to home
          </Button>
        </div>
        </div>
      </main>
    );
  }

  const arch = getArchetypeDefinition(snapshot.archetype as any);
  const shareUrl = shareToken
    ? `${process.env.NEXT_PUBLIC_URL ?? "https://whatdo.co.in"}/?ref=${shareToken}`
    : `${process.env.NEXT_PUBLIC_URL ?? "https://whatdo.co.in"}/whatdo`;

  const shareText =
    `I'm ${arch?.label ?? "a WhatDo-er"} on WHATDO — ${arch?.tagline ?? "Take the 2-min quiz"}. ${shareUrl}`;

  const safeTrackClick = (event: "CLICK" | "DOWNLOAD" | "PROMPT_COPY" | "CHALLENGE") => {
    if (!shareToken) return;
    try {
      trackClick.mutate({ shareToken, event });
    } catch {
    }
  };

  const downloadPNG = async () => {
    const c = canvasRef.current;
    if (!c) return;
    safeTrackClick("DOWNLOAD");
    const blob = await new Promise<Blob>((resolve, reject) => {
      c.toBlob((b) => (b ? resolve(b) : reject(new Error("blob"))), "image/png");
    });
    const a = document.createElement("a");
    const url = URL.createObjectURL(blob);
    a.href = url;
    const tplName = (CARD_TEMPLATES[templateIdx] ?? "MINIMAL").toLowerCase();
    a.download = `my-whatdo-${tplName}-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      a.remove();
    }, 500);
  };

  const shareNative = async () => {
    safeTrackClick("CLICK");
    const c = canvasRef.current;
    const files: File[] = [];
    if (c) {
      const blob = await new Promise<Blob | null>((resolve) =>
        c.toBlob((b) => resolve(b), "image/png"),
      );
      if (blob) {
        files.push(
          new File([blob], `my-whatdo-${CARD_TEMPLATES[templateIdx] ?? "MINIMAL"}.png`, {
            type: "image/png",
          }),
        );
      }
    }
    const anyNav = navigator as any;
    if (anyNav.share && anyNav.canShare && files.length > 0) {
      try {
        await anyNav.share({ title: "My WhatDo Type", text: shareText, files, url: shareUrl });
        return;
      } catch {
      }
    }
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      setCopied("link");
      setTimeout(() => setCopied(null), 1400);
      return;
    }
  };

  const copyAIPrompt = async () => {
    if (!genPrompt.data?.prompt) return;
    safeTrackClick("PROMPT_COPY");
    await navigator.clipboard.writeText(genPrompt.data.prompt);
    setCopied("prompt");
    setTimeout(() => setCopied(null), 1400);
  };

  const challengeFriend = async () => {
    safeTrackClick("CHALLENGE");
    const t = `Challenge accepted? 🎯 I just got "${arch?.label ?? "My WhatDo Type"}.\nTake the 2-min quiz and compare → ${shareUrl}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Challenge your WhatDo", text: t, url: shareUrl });
        return;
      } catch {}
    }
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(t);
      setCopied("link");
      setTimeout(() => setCopied(null), 1400);
    }
  };

  return (
    <main className="min-h-[100dvh] w-full bg-gradient-to-b from-slate-950 via-indigo-950 to-fuchsia-950 text-white pb-24">
      <div className="mx-auto max-w-xl px-4 py-6 md:py-10 space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/whatdo" className="inline-flex items-center gap-1.5 text-sm font-bold text-white/85 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <p className="text-[11.5px] font-bold text-white/70">
            {isLoggedIn ? (
            <>
              <Users className="h-3.5 w-3.5 inline mr-1" /> Your card links friends land on home + referral credits
            </>
          ) : (
            <>
              <Lock className="h-3.5 w-3.5 inline mr-1" /> Login to unlock share tokens & referrals
            </>
          )}
          </p>
        </div>

        <header className="space-y-2 text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/15 px-3 py-1 text-[10.5px] font-black uppercase tracking-widest text-white/85">
            <Eye className="h-3 w-3" /> Your result
          </div>
          <h1 className="text-3xl sm:text-4xl font-black leading-tight tracking-tight">
            {arch?.emoji ?? "✨"} {arch?.label ?? snapshot.archetype}
          </h1>
          <p className="text-sm text-white/80 max-w-md mx-auto">
            {arch?.tagline ?? ""}
          </p>
        </header>

        <section className="space-y-3">
          <div className="flex items-center justify-between text-[11px] font-bold text-white/70 px-1">
          <span>Pick a card style</span>
          <div className="inline-flex items-center gap-1">
            <button
              type="button"
              onClick={() => setTemplateIdx((i) => (i - 1 + CARD_TEMPLATES.length) % CARD_TEMPLATES.length)}
              className="h-7 w-7 rounded-full bg-white/10 border border-white/15 hover:bg-white/15 flex items-center justify-center"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="px-2 min-w-[84px] text-center">
              {String(CARD_TEMPLATES[templateIdx] as WhatDoCardTemplate)}
            </span>
            <button
              type="button"
              onClick={() => setTemplateIdx((i) => (i + 1) % CARD_TEMPLATES.length)}
              className="h-7 w-7 rounded-full bg-white/10 border border-white/15 hover:bg-white/15 flex items-center justify-center"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-6 gap-2">
          {(CARD_TEMPLATES as readonly string[]).map((t, i) => (
            <button
              key={t}
              type="button"
              onClick={() => setTemplateIdx(i)}
              className={cn(
                "h-10 rounded-xl text-[10px] font-black tracking-widest transition-all border",
                i === templateIdx
                  ? "bg-white text-black border-white shadow scale-[1.02]"
                  : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10",
              )}
            >
              {t.split("_")[0]}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-3xl bg-black/30 border border-white/10 p-3">
        <div className="overflow-hidden rounded-2xl shadow-2xl shadow-black/50 bg-black">
          <canvas
            ref={canvasRef}
            width={CARD_W}
            height={CARD_H}
            className="w-full h-auto block"
          />
        </div>
      </section>

      <section className="grid grid-cols-2 gap-2.5">
        <Button size="lg" onClick={downloadPNG} className="rounded-full bg-white text-black hover:bg-white/95 border-0 shadow-xl shadow-black/30">
          <Download className="h-4.5 w-4.5" /> Download PNG
        </Button>
        <Button size="lg" variant="outline" onClick={shareNative} className="rounded-full">
          <Share2 className="h-4.5 w-4.5" /> Share
        </Button>
        <Button
          size="md"
          variant="outline"
          onClick={copyAIPrompt}
          disabled={!genPrompt.data?.prompt}
          className="rounded-full"
        >
          {copied === "prompt" ? (
            <>
              <Check className="h-4 w-4" /> Prompt copied
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" /> Copy AI prompt
            </>
          )}
        </Button>
        <Button size="md" variant="outline" onClick={challengeFriend} className="rounded-full">
          <MessageCircle className="h-4 w-4" /> Challenge a friend
        </Button>
      </section>

      {!isLoggedIn && (
        <section className="rounded-3xl border border-fuchsia-400/20 bg-fuchsia-500/10 p-5 space-y-3">
          <p className="text-sm font-black text-white">
            🔒 Login to get your personal referral link
          </p>
          <p className="text-xs text-white/80">
            Share cards signed in append your token. Every friend that signs up & completes WhatDo earns
            you the referral and unlocks more detailed analytics on your influence.
          </p>
          <Button size="md" onClick={() => openLogin()} className="rounded-full w-full">
            Login now <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </section>
      )}

      {isLoggedIn && shareToken && (
        <section className="rounded-3xl bg-white/5 border border-white/10 p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-widest text-white/70">
              Your share link
            </p>
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(shareUrl);
                setCopied("link");
                setTimeout(() => setCopied(null), 1400);
              }}
              className="inline-flex items-center gap-1 text-[11.5px] font-bold text-white/85 hover:text-white transition-colors"
            >
              {copied === "link" ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-300" /> Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" /> Copy
                </>
              )}
            </button>
          </div>
          <p className="text-xs text-fuchsia-200 font-mono break-all bg-black/30 rounded-xl border border-white/10 px-3 py-2">
            {shareUrl}
          </p>
        </section>
      )}

      {genPrompt.data?.prompt && (
        <section className="rounded-3xl bg-white/5 border border-white/10 p-5 space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-white/70">
            AI image prompt
          </p>
          <p className="text-[12.5px] leading-relaxed text-white/85 whitespace-pre-wrap">
            {genPrompt.data.prompt}
          </p>
          <p className="text-[11px] text-amber-200/80 font-semibold">
            {genPrompt.data.validated ? "Validated: Yes · WhatDo checks for forbidden claims." : "Validated: Review before use."}
          </p>
        </section>
      )}

      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2">
        <Button size="md" variant="ghost" onClick={() => router.push("/whatdo/quiz")} className="rounded-full">
          ↻ Re-take quiz
        </Button>
        <Button size="md" onClick={() => router.push("/")} className="rounded-full">
          <ArrowRight className="h-4 w-4 ml-1" /> Back to feed
        </Button>
      </div>
    </div>
  </main>
  );
}
