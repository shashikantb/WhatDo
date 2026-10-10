"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/design-system/Button";
import { useSession } from "next-auth/react";
import {
  ArrowRight,
  Brain,
  MapPin,
  Share2,
  Shield,
  Sparkles,
  Trophy,
  Users,
  ChevronRight,
  Eye,
  Zap,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { ProgressBar } from "@/components/design-system/ProgressBar";

export { CITY_NORMALIZATIONS, normalizeCityName } from "@/lib/whatdo/cities";

export default function WhatDoLandingPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const trackLanding = trpc.whatdo.trackLanding.useMutation();
  const summary = trpc.adminQuestions.summaryStats.useQuery(undefined, {
    staleTime: 120_000,
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
    }
  );
  const isLoggedIn = status === "authenticated";
  const [city, setCity] = React.useState("");
  const [ageGroup, setAgeGroup] = React.useState<string>("");
  const [startClicked, setStartClicked] = React.useState(false);

  const start = trpc.whatdo.startAssessment.useMutation();

  const handleBegin = async () => {
    setStartClicked(true);
    let sid = null;
    try {
      sid = window.localStorage.getItem("whatdo_sess");
    } catch {
    }
    // Normalize city so Bengaluru / bangalore / " Bengaluru " all pick Bangalore-targeted questions
    const normalizedCity = typeof city === "string" && city.trim().length > 0
      ? normalizeCityName(city)
      : null;
    if (normalizedCity) {
      try {
        window.localStorage.setItem("whatdo_city", normalizedCity);
      } catch {}
    } else {
      try {
        window.localStorage.removeItem("whatdo_city");
      } catch {}
    }
    const resp = await trackLanding.mutateAsync({
      sessionId: sid ?? undefined,
    });
    const started = await start.mutateAsync({
      sessionId: resp.sessionId,
      city: normalizedCity,
      ageGroup: ageGroup || null,
    });
    try {
      window.localStorage.setItem("whatdo_sess", started.sessionId);
    } catch {
    }
    document.cookie =
      "whatdo_sess=" +
      encodeURIComponent(started.sessionId) +
      "; path=/; max-age=" +
      14 * 24 * 60 * 60 +
      (window.location.protocol === "https:" ? "; secure" : "") +
      "; SameSite=Lax";
    router.push("/whatdo/quiz");
  };

  return (
    <main className="min-h-[100dvh] w-full bg-gradient-to-br from-slate-950 via-indigo-950 to-fuchsia-950 text-white">
      <div className="mx-auto w-full max-w-2xl px-5 py-10 md:py-16 space-y-10">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-bold text-white/90 hover:text-white transition-colors"
          >
            <span className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow">
              W
            </span>
            WHATDO
          </Link>
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-white/75">
            <Users className="h-3.5 w-3.5" />
            <span>{(summary.data?.identities ?? 0).toLocaleString()} typed</span>
          </div>
        </div>

        <section className="space-y-7">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur px-3 py-1.5">
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            <span className="text-[11px] font-bold tracking-wide uppercase text-white/90">
              My WhatDo · Viral Identity Quiz
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-black leading-[1.02] tracking-tight">
            Don&apos;t guess.
            <span className="block bg-gradient-to-r from-fuchsia-300 via-white to-amber-200 bg-clip-text text-transparent">
              Ask WHATDO.
            </span>
          </h1>
          <p className="text-[16px] leading-relaxed text-white/80 max-w-xl">
            Answer 12 real questions the WhatDo community is voting on right
            now. See where you align vs your city, discover your rarest
            answer, and get a share card your friends will click.
          </p>
        </section>

        <section className="grid grid-cols-2 gap-3">
          {[
            { icon: Users, title: "Real crowdsourced", body: "Percentages from actual voters, never fabricated." },
            { icon: MapPin, title: "Your city vs world", body: "See how your cohort thinks differently." },
            { icon: Trophy, title: "Rare answer badge", body: "Celebrate the takes almost no one else picks." },
            { icon: Share2, title: "6 share card designs", body: "PNG 1080×1920. One-tap download + WhatsApp." },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-2xl bg-white/5 border border-white/10 p-4 backdrop-blur"
            >
              <f.icon className="h-4.5 w-4.5 text-fuchsia-300 mb-2" />
              <p className="text-sm font-black text-white">{f.title}</p>
              <p className="mt-1 text-xs text-white/70 leading-relaxed">
                {f.body}
              </p>
            </div>
          ))}
        </section>

        <section className="rounded-3xl bg-white/5 border border-white/10 p-5 backdrop-blur space-y-5">
          <h3 className="text-lg font-black leading-tight">
            Optional — make your result more accurate
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-white/70 block mb-1.5">
                City (we compare against your cohort)
              </span>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Mumbai, Bangalore, Delhi…"
                className="w-full rounded-xl bg-black/30 border border-white/15 px-3.5 py-2.5 text-sm placeholder-white/35 focus:outline-none focus:border-fuchsia-400"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-white/70 block mb-1.5">
                Age group
              </span>
              <select
                value={ageGroup}
                onChange={(e) => setAgeGroup(e.target.value)}
                className="w-full rounded-xl bg-black/30 border border-white/15 px-3.5 py-2.5 text-sm focus:outline-none focus:border-fuchsia-400 appearance-none"
              >
                <option value="">Prefer not to say</option>
                <option value="13-17">13–17</option>
                <option value="18-24">18–24</option>
                <option value="25-34">25–34</option>
                <option value="35-44">35–44</option>
                <option value="45+">45+</option>
              </select>
            </label>
          </div>
          <div className="flex items-start gap-2 rounded-2xl bg-emerald-500/10 border border-emerald-400/15 p-3">
            <Shield className="h-4 w-4 text-emerald-300 mt-0.5 shrink-0" />
            <p className="text-[11.5px] text-emerald-100/90 leading-relaxed">
              We never share individual answers. Only aggregated percentages
              are shown publicly. No exact location coordinates are ever
              stored — just the city name you type here.
            </p>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-white/80">
            <span className="inline-flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5" /> 12 questions · ~2 min
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-amber-300" /> Anonymous OK · login after to save
            </span>
          </div>
          <ProgressBar value={15} className="h-1.5 w-full bg-white/10" />

          <Button
            size="lg"
            onClick={handleBegin}
            disabled={startClicked || trackLanding.isPending || start.isPending}
            rightIcon={
              startClicked ? undefined : <ArrowRight className="h-5 w-5" />
            }
            className="w-full rounded-full py-4 text-base shadow-2xl shadow-black/30 border-0 bg-white text-black hover:bg-white/95"
          >
            {startClicked
              ? "Starting quiz…"
              : existingIdentity.data?.whatdoType
                ? "Continue / re-take quiz"
                : isLoggedIn
                  ? "Start My WhatDo Quiz"
                  : "Start Quiz (anonymous OK)"}
          </Button>
          {!isLoggedIn && (
            <p className="text-center text-[11.5px] text-white/65">
              You can answer 10 questions without an account. Login at the end
              to keep your WhatDo Type and claim referrals.
            </p>
          )}
        </section>

        <section className="pt-4 border-t border-white/10 grid grid-cols-3 gap-3 text-center text-white/80 text-[11.5px] font-semibold">
          <div>
            <Brain className="h-4 w-4 text-white/80 mx-auto mb-1" />
            12 Archetypes
          </div>
          <div>
            <Sparkles className="h-4 w-4 text-white/80 mx-auto mb-1" />
            13 Categories
          </div>
          <div>
            <ChevronRight className="h-4 w-4 text-white/80 mx-auto mb-1" />
            9 Answer styles
          </div>
        </section>
      </div>
    </main>
  );
}
