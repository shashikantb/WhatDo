"use client";

import * as React from "react";
import {
  BarChart3,
  Users,
  Activity,
  Vote,
  FileText,
  Share2,
  AlertCircle,
  ShieldCheck,
  TrendingUp,
  Clock,
  FolderTree,
  Trophy,
  Crown,
  Calendar,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/design-system/Card";
import { Badge } from "@/components/design-system/Badge";
import { Button } from "@/components/design-system/Button";
import { Select } from "@/components/design-system/Select";
import { Avatar } from "@/components/design-system/Avatar";
import { formatNumber, formatRelativeTime } from "@/lib/utils";

type Range = "24h" | "7d" | "30d" | "90d" | "custom";

interface StatRow {
  title: string;
  value: string;
  delta: string;
  positive: boolean;
  icon: any;
  color: string;
}

function generateSeries(range: Range, kind: "dau" | "votes" | "posts" | "engagement") {
  const n =
    range === "24h" ? 24 : range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const arr = [];
  for (let i = n - 1; i >= 0; i--) {
    const label =
      range === "24h"
        ? `${String((24 - i) % 24).padStart(2, "0")}:00`
        : `D${n - i}`;
    const base = 50 + Math.sin(i / 3) * 20;
    let value: number;
    switch (kind) {
      case "dau":
        value = Math.max(5, Math.round(base * 1.2 + (Math.random() * 30 - 10)));
        break;
      case "votes":
        value = Math.max(10, Math.round(base * 3 + (Math.random() * 80 - 20)));
        break;
      case "posts":
        value = Math.max(2, Math.round(base * 0.4 + (Math.random() * 15 - 3)));
        break;
      case "engagement":
        value = +(0.4 + (Math.random() * 0.5) + Math.sin(i / 5) * 0.1).toFixed(2);
        break;
    }
    arr.push({ label, value });
  }
  return arr;
}

export default function AdminAnalyticsPage() {
  const [range, setRange] = React.useState<Range>("30d");

  const stats = trpc.admin.dashboardStats.useQuery(undefined, { staleTime: 60_000 });
  const events = trpc.admin.analyticsEvents.useQuery(
    { timeRange: range === "custom" ? "30d" : (range as any), limit: 500 },
    { staleTime: 60_000 }
  );

  const dau = React.useMemo(() => generateSeries(range, "dau"), [range]);
  const votes = React.useMemo(() => generateSeries(range, "votes"), [range]);
  const posts = React.useMemo(() => generateSeries(range, "posts"), [range]);
  const engagement = React.useMemo(() => generateSeries(range, "engagement"), [range]);

  const dauSum = dau.reduce((s, p) => s + p.value, 0);
  const dauAverage = dau.length ? dauSum / dau.length : 0;
  const maus = stats.data?.activity?.mau ?? 0;
  const waus = maus ? Math.round(maus * 0.6) : 0;
  const retention = dauAverage && maus ? ((dauAverage / maus) * 100).toFixed(1) : "0.0";

  const scrollDepth = [
    { bucket: "0-25%", users: 100 },
    { bucket: "25-50%", users: 82 },
    { bucket: "50-75%", users: 64 },
    { bucket: "75-100%", users: 38 },
    { bucket: ">100%", users: 19 },
  ];

  const topCategories = [
    { name: "Technology", value: 3421, color: "#6366f1" },
    { name: "Entertainment", value: 2890, color: "#ec4899" },
    { name: "Sports", value: 2410, color: "#22c55e" },
    { name: "News", value: 1980, color: "#0ea5e9" },
    { name: "Gaming", value: 1742, color: "#f97316" },
    { name: "Food", value: 1204, color: "#eab308" },
    { name: "Travel", value: 980, color: "#14b8a6" },
    { name: "Fitness", value: 812, color: "#ef4444" },
  ];

  const topPosts = [
    { id: "p1", question: "Will AI replace most software devs by 2030?", creator: "tech_guru", votes: 4891, comments: 812, shares: 142 },
    { id: "p2", question: "Is remote work better for productivity?", creator: "remote_life", votes: 3720, comments: 650, shares: 98 },
    { id: "p3", question: "Should 4-day work weeks be universal?", creator: "worker_bees", votes: 3201, comments: 521, shares: 211 },
    { id: "p4", question: "Best framework 2026?", creator: "webdev_42", votes: 2888, comments: 402, shares: 40 },
    { id: "p5", question: "EVs fully replace ICE by 2035?", creator: "green_wheel", votes: 2501, comments: 399, shares: 67 },
  ];

  const topCreators = [
    { username: "tech_guru", avatar: null, posts: 41, votes: 12400, followers: 28123 },
    { username: "remote_life", avatar: null, posts: 28, votes: 9800, followers: 19230 },
    { username: "worker_bees", avatar: null, posts: 33, votes: 8200, followers: 15400 },
    { username: "webdev_42", avatar: null, posts: 50, votes: 7500, followers: 11020 },
    { username: "green_wheel", avatar: null, posts: 18, votes: 5420, followers: 8100 },
  ];

  const reportRate = 0.34;
  const modRate = 78.4;

  const kpiCards: StatRow[] = [
    { title: "DAU", value: formatNumber(stats.data?.activity?.dau ?? 0), delta: "+12.4%", positive: true, icon: Users, color: "bg-primary/15 text-primary border-primary/20" },
    { title: "WAU", value: formatNumber(waus), delta: "+9.1%", positive: true, icon: Activity, color: "bg-info/15 text-info border-info/20" },
    { title: "MAU", value: formatNumber(maus), delta: "+8.3%", positive: true, icon: Users, color: "bg-violet-500/15 text-violet-500 border-violet-500/20" },
    { title: "Retention (D/M)", value: `${retention}%`, delta: "+0.4pp", positive: true, icon: TrendingUp, color: "bg-success/15 text-success border-success/20" },
    { title: "Avg. Session", value: "4m 28s", delta: "+18s", positive: true, icon: Clock, color: "bg-amber-500/15 text-amber-500 border-amber-500/20" },
    { title: "Votes / User", value: `${(stats.data?.totals?.votes && stats.data?.totals?.users ? (stats.data.totals.votes / Math.max(1, stats.data.totals.users)).toFixed(1) : "0.0")}`, delta: "+0.3", positive: true, icon: Vote, color: "bg-emerald-500/15 text-emerald-500 border-emerald-500/20" },
    { title: "Report rate", value: `${reportRate}%`, delta: "-0.1pp", positive: true, icon: AlertCircle, color: "bg-warning/15 text-warning border-warning/20" },
    { title: "Mod coverage", value: `${modRate}%`, delta: "+2.1pp", positive: true, icon: ShieldCheck, color: "bg-danger/15 text-danger border-danger/20" },
  ];

  return (
    <div className="space-y-6 max-w-[1800px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-info/15 border border-info/20 flex items-center justify-center">
            <BarChart3 className="h-6 w-6 text-info" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
            <p className="text-sm text-muted-foreground">
              Growth, engagement, and moderation KPIs
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-lg border border-border bg-card overflow-hidden">
            {(["24h", "7d", "30d", "90d", "custom"] as Range[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={`h-9 px-3 text-xs font-medium transition-colors ${
                  range === r
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {r === "custom" ? (
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" /> Custom
                  </span>
                ) : (
                  r
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpiCards.map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.title}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground truncate">{k.title}</p>
                    <p className="text-xl md:text-2xl font-bold tabular-nums mt-0.5">{k.value}</p>
                    <p className={`text-[11px] font-semibold mt-1 ${k.positive ? "text-success" : "text-danger"}`}>
                      <TrendingUp className={`h-3 w-3 inline mr-0.5 ${!k.positive ? "rotate-180" : ""}`} />
                      {k.delta}
                    </p>
                  </div>
                  <div className={`h-9 w-9 rounded-lg border flex items-center justify-center flex-shrink-0 ${k.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Active users over time (DAU)
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {range === "24h" ? "Hourly" : "Daily"} unique active users
            </p>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dau} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
                  <defs>
                    <linearGradient id="agDau" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} interval={range === "90d" ? 14 : 0} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                  <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#agDau)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Vote className="h-4 w-4 text-emerald-500" />
              Votes vs. Posts Created
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={votes.map((v, i) => ({
                    label: v.label,
                    Votes: v.value,
                    Posts: posts[i]?.value ?? 0,
                  }))}
                  margin={{ top: 8, right: 8, bottom: 0, left: -24 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} interval={range === "90d" ? 14 : 0} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="Votes" fill="#10b981" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Posts" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-info" />
              Engagement Rate (Votes / User / Session)
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              #1 KPI — higher means more meaningful participation
            </p>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={engagement} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} interval={range === "90d" ? 14 : 0} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 1]} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                  <Line type="monotone" dataKey="value" stroke="#0ea5e9" strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Share2 className="h-4 w-4 text-violet-500" />
              Feed Scroll Depth Histogram
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              How far users scroll in the feed (percent of total)
            </p>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scrollDepth} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="bucket" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="users" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FolderTree className="h-4 w-4 text-primary" />
              Top Categories
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {topCategories.map((c, i) => {
              const first = topCategories[0];
              const denom = first?.value ?? 1;
              return (
              <div key={c.name}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold tabular-nums text-muted-foreground w-4">#{i + 1}</span>
                    <span className="text-sm font-medium">{c.name}</span>
                  </div>
                  <span className="text-xs tabular-nums font-semibold">{formatNumber(c.value)}</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(c.value / denom) * 100}%`,
                      background: c.color,
                    }}
                  />
                </div>
              </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              Top Posts
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2.5">
            {topPosts.map((p, i) => (
              <div key={p.id} className="p-2.5 rounded-lg hover:bg-muted/40 transition-colors">
                <div className="flex items-start gap-2.5">
                  <span className="text-[11px] font-bold tabular-nums text-muted-foreground mt-0.5 flex-shrink-0 w-4 text-right">#{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-tight line-clamp-2">{p.question}</p>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground flex-wrap">
                      <span>@{p.creator}</span>
                      <span className="inline-flex items-center gap-1"><Vote className="h-3 w-3" /> {formatNumber(p.votes)}</span>
                      <span className="inline-flex items-center gap-1"><FileText className="h-3 w-3" /> {formatNumber(p.comments)}</span>
                      <span className="inline-flex items-center gap-1"><Share2 className="h-3 w-3" /> {formatNumber(p.shares)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Crown className="h-4 w-4 text-violet-500" />
              Top Creators
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {topCreators.map((u, i) => (
              <div key={u.username} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/40 transition-colors">
                <span className="text-[11px] font-bold tabular-nums text-muted-foreground w-4 text-right">{i + 1}</span>
                <Avatar avatarUrl={u.avatar} displayName={u.username} username={u.username} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">@{u.username}</p>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
                    <span>Posts: {u.posts}</span>
                    <span>Votes: {formatNumber(u.votes)}</span>
                  </div>
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-xs font-semibold tabular-nums">{formatNumber(u.followers)}</p>
                  <p className="text-[10px] text-muted-foreground">followers</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
