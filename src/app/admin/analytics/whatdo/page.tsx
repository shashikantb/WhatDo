"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Eye,
  Sparkles,
  Users,
  Download,
  Share2,
  Trophy,
  Activity,
  TrendingUp,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/design-system/Card";
import { Button } from "@/components/design-system/Button";
import { Select } from "@/components/design-system/Select";
import { WHATDO_FUNNEL_EVENT_NAMES } from "@/lib/whatdo/funnel-events";

const FUNNEL_LABELS: Record<string, { label: string; emoji: string }> = {
  WHATDO_LANDING_VIEWED: { label: "Landing page viewed", emoji: "👀" },
  QUIZ_STARTED: { label: "Quiz started", emoji: "▶️" },
  QUESTION_SHOWN: { label: "Question shown", emoji: "❓" },
  ANSWER_SUBMITTED: { label: "Answer submitted", emoji: "✅" },
  RESULT_VIEWED: { label: "Result viewed", emoji: "🎯" },
  RESULT_REVEALED: { label: "Result revealed (login)", emoji: "🔓" },
  SHARE_CARD_DOWNLOADED: { label: "Card PNG downloaded", emoji: "⬇️" },
  SHARE_BUTTON_CLICKED: { label: "Share button clicked", emoji: "📤" },
  SHARE_LINK_CLICKED: { label: "Share link clicked", emoji: "🔗" },
  SHARE_LINK_SIGNUP: { label: "Referral → signup", emoji: "🆕" },
  REFERRAL_SHARED: { label: "Referral share created", emoji: "💌" },
  REFERRAL_COMPLETED: { label: "Referral completed", emoji: "🏁" },
  FRIEND_CHALLENGED: { label: "Friend challenged", emoji: "🤝" },
  AI_PROMPT_COPIED: { label: "AI prompt copied", emoji: "🤖" },
};

const CHART_COLORS = [
  "#6366f1", "#f43f5e", "#22c55e", "#f59e0b", "#0ea5e9", "#a855f7",
  "#14b8a6", "#e11d48", "#84cc16", "#fb7185", "#38bdf8", "#c084fc",
  "#4ade80", "#f97316",
];

const CORE_CONVERSIONS = [
  "WHATDO_LANDING_VIEWED",
  "QUIZ_STARTED",
  "ANSWER_SUBMITTED",
  "RESULT_VIEWED",
  "SHARE_BUTTON_CLICKED",
  "SHARE_LINK_SIGNUP",
];

function lastNDays(n: number) {
  const out: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

export default function WhatDoAnalyticsPage() {
  const [days, setDays] = React.useState(14);
  const stats = trpc.adminQuestions.funnelStats.useQuery(
    { days },
    { refetchOnMount: true, staleTime: 60_000 },
  );
  const summary = trpc.adminQuestions.summaryStats.useQuery(undefined, {
    staleTime: 60_000,
  });
  const totals = stats.data?.totals ?? ({} as Record<string, number>);
  const byDay = stats.data?.byDay ?? {};
  const dateLabels = lastNDays(days);

  const chartSeries = React.useMemo(() => {
    const core = CORE_CONVERSIONS.filter((e) => WHATDO_FUNNEL_EVENT_NAMES.includes(e as any));
    return dateLabels.map((day) => {
      const row: Record<string, any> = { date: day.slice(5) };
      for (const ev of core) {
        row[ev.slice(0, 3) + "_" + ev.split("_").slice(-1)[0]] = byDay[day]?.[ev] ?? 0;
      }
      return row;
    });
  }, [dateLabels, byDay]);

  const landing = totals.WHATDO_LANDING_VIEWED ?? 0;
  const started = totals.QUIZ_STARTED ?? 0;
  const answered = totals.ANSWER_SUBMITTED ?? 0;
  const results = totals.RESULT_VIEWED ?? 0;
  const shared = (totals.SHARE_BUTTON_CLICKED ?? 0) + (totals.SHARE_CARD_DOWNLOADED ?? 0);
  const refSignups = totals.SHARE_LINK_SIGNUP ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <Link
            href="/admin/questions"
            className="text-xs font-bold uppercase tracking-widest text-muted-foreground inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to questions
          </Link>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight mt-1.5">
            WhatDo Funnel Analytics
          </h1>
          <p className="text-sm text-muted-foreground">
            14 events tracked per spec §21 · Share-card referrals, signups,
            reveal, and challenge.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={String(days)}
            onChange={(v) => setDays(Number(v))}
            className="w-40"
            options={[
              { value: "7", label: "Last 7 days" },
              { value: "14", label: "Last 14 days" },
              { value: "30", label: "Last 30 days" },
              { value: "60", label: "Last 60 days" },
            ]}
          />
          <Link href="/admin/questions">
            <Button size="md" variant="outline">
              Moderate library
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          {
            icon: Eye,
            color: "text-indigo-600",
            title: "Landing → quiz",
            value: `${landing.toLocaleString()} → ${started.toLocaleString()}`,
            sub: landing > 0 ? `${Math.round((started / landing) * 100)}% conversion` : "—",
          },
          {
            icon: Sparkles,
            color: "text-fuchsia-600",
            title: "Answers",
            value: answered.toLocaleString(),
            sub: "submitted",
          },
          {
            icon: Trophy,
            color: "text-amber-600",
            title: "Identities",
            value: (summary.data?.identities ?? 0).toLocaleString(),
            sub: `${results.toLocaleString()} results viewed`,
          },
          {
            icon: Share2,
            color: "text-emerald-600",
            title: "Shares",
            value: shared.toLocaleString(),
            sub: "downloads + clicks",
          },
          {
            icon: Users,
            color: "text-rose-600",
            title: "Referrals → signup",
            value: refSignups.toLocaleString(),
            sub: `${(totals.SHARE_LINK_CLICKED ?? 0).toLocaleString()} link clicks`,
          },
        ].map((s) => (
          <Card key={s.title}>
            <CardContent className="p-4">
              <s.icon className={`h-4.5 w-4.5 ${s.color} mb-1.5`} />
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                {s.title}
              </p>
              <p className="mt-0.5 text-xl font-black tracking-tight tabular-nums">
                {s.value}
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-muted-foreground">
                {s.sub}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <CardTitle className="text-base font-bold">
            6-step core funnel · {days} days
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {WHATDO_FUNNEL_EVENT_NAMES.length} events tracked. See all 14 in
            the table below.
          </p>
        </CardHeader>
        <CardContent>
          <div className="w-full h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartSeries}
                margin={{ top: 12, right: 16, left: 0, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip />
                <Legend
                  wrapperStyle={{ fontSize: "11px", paddingTop: "12px" }}
                />
                {CORE_CONVERSIONS.filter((e) =>
                  WHATDO_FUNNEL_EVENT_NAMES.includes(e as any),
                ).map((ev, idx) => {
                  const k = ev.slice(0, 3) + "_" + ev.split("_").slice(-1)[0];
                  return (
                    <Line
                      key={ev}
                      type="monotone"
                      dataKey={k}
                      name={FUNNEL_LABELS[ev]?.label ?? ev}
                      stroke={CHART_COLORS[idx % CHART_COLORS.length]}
                      strokeWidth={2.2}
                      dot={{ r: 2 }}
                      activeDot={{ r: 4 }}
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <CardTitle className="text-base font-bold">
            All 14 WhatDo events · totals
          </CardTitle>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Activity className="h-3.5 w-3.5" /> Sorted by volume
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {WHATDO_FUNNEL_EVENT_NAMES.map((name, idx) => {
            const value = totals[name] ?? 0;
            const max = Math.max(
              1,
              ...WHATDO_FUNNEL_EVENT_NAMES.map((n) => totals[n] ?? 0),
            );
            const pct = Math.max(1, (value / max) * 100);
            return (
              <div key={name} className="space-y-1">
                <div className="flex items-center justify-between text-[12px]">
                  <span className="font-semibold text-foreground">
                    {FUNNEL_LABELS[name]?.emoji} {FUNNEL_LABELS[name]?.label ?? name}
                  </span>
                  <span className="font-black tabular-nums text-muted-foreground">
                    {value.toLocaleString()}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${pct}%`,
                      background: CHART_COLORS[idx % CHART_COLORS.length],
                    }}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold">
            Conversion quick math
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <Metric
              label="Landing → quiz started"
              a={landing}
              b={started}
            />
            <Metric
              label="Answer → result viewed"
              a={answered}
              b={results}
            />
            <Metric
              label="Result → share action"
              a={results}
              b={shared}
            />
            <Metric
              label="Link click → signup"
              a={totals.SHARE_LINK_CLICKED ?? 0}
              b={refSignups}
            />
            <Metric
              label="Signup → reveal"
              a={refSignups}
              b={totals.RESULT_REVEALED ?? 0}
            />
            <Metric
              label="Signup → completion"
              a={refSignups}
              b={totals.REFERRAL_COMPLETED ?? 0}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end">
        <Button
          size="md"
          variant="outline"
          onClick={() => stats.refetch()}
        >
          <TrendingUp className="h-4 w-4 mr-1.5" /> Refresh
        </Button>
      </div>
    </div>
  );
}

function Metric({
  label,
  a,
  b,
}: {
  label: string;
  a: number;
  b: number;
}) {
  const pct = a > 0 ? Math.round((b / a) * 100) : 0;
  return (
    <div className="rounded-2xl bg-muted/40 border border-border px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-lg font-black tracking-tight tabular-nums">
        {a.toLocaleString()} → {b.toLocaleString()}
      </p>
      <p className="mt-0.5 text-[12px] font-semibold text-emerald-700">
        {pct}% conversion
      </p>
    </div>
  );
}
