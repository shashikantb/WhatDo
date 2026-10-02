"use client";

import * as React from "react";
import Link from "next/link";
import {
  Users,
  Flag,
  TrendingUp,
  Shield,
  BarChart3,
  ChevronRight,
  Vote,
  UserPlus,
  Clock,
  Eye,
  Ban,
  AlertCircle,
  Star,
  FileText,
  FolderTree,
  Megaphone,
  LineChart as LineChartIcon,
  Activity,
} from "lucide-react";
import {
  ResponsiveContainer,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/design-system/Card";
import { Badge } from "@/components/design-system/Badge";
import { Button } from "@/components/design-system/Button";
import { formatNumber, formatRelativeTime } from "@/lib/utils";

interface StatCardProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  value: string | number;
  change?: string;
  changePositive?: boolean;
  sublabel?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  icon: Icon,
  iconColor,
  value,
  change,
  changePositive = true,
  sublabel,
}) => (
  <Card>
    <CardContent className="p-5">
      <div className="flex items-start justify-between">
        <div className="space-y-2 min-w-0 flex-1 pr-3">
          <p className="text-sm font-medium text-muted-foreground truncate">{title}</p>
          <p className="text-2xl md:text-3xl font-bold tracking-tight tabular-nums">
            {value}
          </p>
          {(change || sublabel) && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {change && (
                <span
                  className={`inline-flex items-center gap-1 font-medium ${
                    changePositive ? "text-success" : "text-danger"
                  }`}
                >
                  <TrendingUp
                    className={`h-3 w-3 ${!changePositive ? "rotate-180" : ""}`}
                  />
                  {change}
                </span>
              )}
              {sublabel && (
                <span className="text-muted-foreground">{sublabel}</span>
              )}
            </div>
          )}
        </div>
        <div
          className={`h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0 ${iconColor}`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </CardContent>
  </Card>
);

export default function AdminDashboardPage() {
  const stats = trpc.admin.dashboardStats.useQuery(undefined, {
    staleTime: 60_000,
  });

  const ts = trpc.admin.dashboardTimeseries.useQuery({ days: 30 }, { staleTime: 120_000 });
  const series = ts.data?.series ?? Array.from({ length: 30 }, () => ({
    day: "",
    dateISO: "",
    signups: 0,
    activeUsers: 0,
    quizStarts: 0,
    quizReveals: 0,
    quizAnswerResponses: 0,
    shareClicks: 0,
    referralSignups: 0,
    shareDownloads: 0,
    aiPromptCopies: 0,
  }));
  const tsTotals = ts.data?.totals;
  const funnel7 = ts.data?.funnelLast7;
  const topReferrers = ts.data?.topReferrers ?? [];

  // Compute small helpers for the WhatDo stat cards
  const wdStart7 = funnel7?.quizStartSessions ?? 0;
  const wdComplete7 = funnel7?.complete12Last7 ?? 0;
  const wdReveals30 = series.reduce((acc: number, r: any) => acc + (r.quizReveals ?? 0), 0);
  const wdStarts30 = series.reduce((acc: number, r: any) => acc + (r.quizStarts ?? 0), 0);
  const wdShareCardActions30 = series.reduce((acc: number, r: any) => acc + ((r.shareDownloads ?? 0) + (r.aiPromptCopies ?? 0)), 0);
  const wdConversion7 = wdStart7 > 0 ? Math.round((wdComplete7 / wdStart7) * 100) : 0;
  const signup24 = stats.data?.growth?.newUsers24h ?? 0;
  const signup30 = series.reduce((acc: number, r: any) => acc + (r.signups ?? 0), 0);
  const active30 = stats.data?.activity?.mau ?? 0;
  const dauToday = stats.data?.activity?.dau ?? 0;
  const dauAvgPer30 = Math.max(1, Math.floor(active30 / 30));
  const dauChangePct = active30 > 0 && dauToday > 0
    ? Math.round((dauToday / dauAvgPer30) * 100 - 100)
    : 0;

  const openReports = trpc.reports.list.useQuery(
    { status: "OPEN", limit: 20 },
    { staleTime: 30_000 }
  );

  const quickActions = React.useMemo(
    () => [
      {
        label: "View moderation queue",
        desc: "Review pending reports",
        icon: Clock,
        color: "bg-warning/15 text-warning border-warning/20",
        href: "/admin/reports",
      },
      {
        label: "Feature a post",
        desc: "Pin to top of feed",
        icon: Star,
        color: "bg-amber-500/15 text-amber-500 border-amber-500/20",
        href: "/admin/posts",
      },
      {
        label: "Suspend a user",
        desc: "Temporary account restriction",
        icon: Ban,
        color: "bg-danger/15 text-danger border-danger/20",
        href: "/admin/users",
      },
      {
        label: "Manage categories",
        desc: "Edit taxonomy",
        icon: FolderTree,
        color: "bg-primary/15 text-primary border-primary/20",
        href: "/admin/categories",
      },
      {
        label: "Manage ads",
        desc: "Ad placements & creatives",
        icon: Megaphone,
        color: "bg-emerald-500/15 text-emerald-500 border-emerald-500/20",
        href: "/admin/ads",
      },
      {
        label: "View analytics",
        desc: "Engagement & growth KPIs",
        icon: LineChartIcon,
        color: "bg-info/15 text-info border-info/20",
        href: "/admin/analytics",
      },
    ],
    []
  );

  const total = stats.data?.totals;

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-danger/15 border border-danger/20 flex items-center justify-center">
            <Shield className="h-6 w-6 text-danger" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Overview of platform activity and moderation queue
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/reports">
              <Flag className="h-4 w-4 mr-1.5" />
              Review reports
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/admin/posts?filter=queue">
              <Clock className="h-4 w-4 mr-1.5" />
              Moderation queue
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Registered Users"
          icon={Users}
          iconColor="bg-primary/15 text-primary border border-primary/20"
          value={stats.isLoading ? "—" : formatNumber(total?.users ?? 0)}
          sublabel="all time"
        />
        <StatCard
          title="Signups (Last 24h)"
          icon={UserPlus}
          iconColor="bg-success/15 text-success border border-success/20"
          value={stats.isLoading ? "—" : formatNumber(signup24)}
          sublabel="rolling 24 hours"
        />
        <StatCard
          title="Signups (30 days)"
          icon={BarChart3}
          iconColor="bg-info/15 text-info border border-info/20"
          value={ts.isLoading ? "—" : formatNumber(signup30)}
          sublabel="charted below"
        />
        <StatCard
          title="Active Users (30d)"
          icon={Activity}
          iconColor="bg-info/15 text-info border border-info/20"
          value={stats.isLoading ? "—" : formatNumber(active30)}
          change={dauChangePct === 0 ? "—" : `${dauChangePct > 0 ? "+" : ""}${dauChangePct}%`}
          changePositive={dauChangePct >= 0}
          sublabel="MAU from events"
        />
        <StatCard
          title="WhatDo Quiz Starts (7d)"
          icon={Vote}
          iconColor="bg-fuchsia-500/15 text-fuchsia-500 border border-fuchsia-500/20"
          value={ts.isLoading ? "—" : formatNumber(wdStart7)}
          sublabel="started last 7 days"
        />
        <StatCard
          title="WhatDo Reveals (30d)"
          icon={Eye}
          iconColor="bg-violet-500/15 text-violet-500 border border-violet-500/20"
          value={ts.isLoading ? "—" : formatNumber(wdReveals30)}
          change={wdStarts30 > 0 ? `${wdConversion7}% complete` : "0% complete"}
          changePositive={wdConversion7 >= 33}
          sublabel="7d conversion to 12/12"
        />
        <StatCard
          title="WhatDo Share Card Actions"
          icon={Star}
          iconColor="bg-pink-500/15 text-pink-500 border border-pink-500/20"
          value={ts.isLoading ? "—" : formatNumber(wdShareCardActions30)}
          sublabel="PNG downloads + AI prompt copies (30d)"
        />
        <StatCard
          title="WhatDo Identity Cards"
          icon={Shield}
          iconColor="bg-indigo-500/15 text-indigo-500 border border-indigo-500/20"
          value={ts.isLoading ? "—" : formatNumber(tsTotals?.whatdoIdentities ?? 0)}
          sublabel={`from ${formatNumber(tsTotals?.whatdoUniqueUsers ?? 0)} unique users`}
        />
        <StatCard
          title="Referral Clicks"
          icon={TrendingUp}
          iconColor="bg-emerald-500/15 text-emerald-500 border border-emerald-500/20"
          value={ts.isLoading ? "—" : formatNumber(tsTotals?.referralClicks ?? 0)}
          sublabel="share link opens all time"
        />
        <StatCard
          title="Referral Signups"
          icon={UserPlus}
          iconColor="bg-amber-500/15 text-amber-500 border border-amber-500/20"
          value={ts.isLoading ? "—" : formatNumber(tsTotals?.referralSignups ?? 0)}
          sublabel="users who arrived via ref cookie"
        />
        <StatCard
          title="Published Posts"
          icon={FileText}
          iconColor="bg-violet-500/15 text-violet-500 border border-violet-500/20"
          value={stats.isLoading ? "—" : formatNumber(total?.posts ?? 0)}
          sublabel="all time"
        />
        <StatCard
          title="Votes & Engagements"
          icon={Vote}
          iconColor="bg-emerald-500/15 text-emerald-500 border border-emerald-500/20"
          value={stats.isLoading ? "—" : formatNumber(total?.votes ?? 0)}
          change={`${formatNumber(total?.comments ?? 0)} comments`}
          changePositive
          sublabel={`${formatNumber(total?.reports ?? 0)} reports`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                User Growth (Last 30 days)
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                New signups per day (bar) vs daily active users (line)
              </p>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} interval={4} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar yAxisId="left" dataKey="signups" name="New signups" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="activeUsers" name="Daily active" stroke="#10b981" strokeWidth={2.5} dot={false} activeDot={{ r: 3 }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Eye className="h-4 w-4 text-violet-500" />
                WhatDo Funnel (Last 7 days)
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Starts → completed 12/12 → identity reveals
              </p>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-4">
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-muted-foreground">Quiz started</span>
                <span className="font-bold tabular-nums text-foreground">{formatNumber(wdStart7)}</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full w-full bg-gradient-to-r from-fuchsia-500 to-violet-500 rounded-full" />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-muted-foreground">Completed 12/12</span>
                <span className="font-bold tabular-nums text-foreground">
                  {formatNumber(wdComplete7)}
                  <span className="font-normal text-muted-foreground ml-1.5">
                    · {wdConversion7}%
                  </span>
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full" style={{ width: `${Math.max(4, wdConversion7)}%` }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-muted-foreground">Identity reveals (last 30d)</span>
                <span className="font-bold tabular-nums text-foreground">{formatNumber(wdReveals30)}</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-full" style={{ width: `${Math.max(4, Math.min(100, wdStarts30 > 0 ? Math.round((wdReveals30 / Math.max(1, wdStarts30)) * 100) : 0))}%` }} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="rounded-xl border border-border bg-muted/40 p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Avg answers / user</p>
                <p className="text-lg font-black tabular-nums mt-0.5">
                  {ts.isLoading ? "—" : Number(tsTotals?.whatdoAvgPerUser ?? 0).toFixed(1)}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-muted/40 p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Staff</p>
                <p className="text-lg font-black tabular-nums mt-0.5">
                  {ts.isLoading ? "—" : `${formatNumber(tsTotals?.admins ?? 0)} ADM · ${formatNumber(tsTotals?.moderators ?? 0)} MOD`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Vote className="h-4 w-4 text-fuchsia-500" />
                WhatDo Quiz Performance (Last 30 days)
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Sessions started vs results revealed (area)
              </p>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                  <defs>
                    <linearGradient id="gWdStart" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#d946ef" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="#d946ef" stopOpacity={0.03} />
                    </linearGradient>
                    <linearGradient id="gWdReveal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.38} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} interval={4} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="quizStarts" name="Quiz started" stroke="#d946ef" strokeWidth={2} fill="url(#gWdStart)" dot={false} activeDot={{ r: 3 }} />
                  <Area type="monotone" dataKey="quizReveals" name="Result revealed" stroke="#6366f1" strokeWidth={2} fill="url(#gWdReveal)" dot={false} activeDot={{ r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                Referral Actions (Last 30 days)
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Share link clicks vs signups from ref
              </p>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} interval={4} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="shareClicks" name="Referral clicks" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="referralSignups" name="Signups via ref" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Star className="h-4 w-4 text-fuchsia-500" />
                Top Referrers (All Time)
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Users whose share links drove the most clicks → signups
              </p>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/analytics/whatdo">
                WhatDo analytics
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full min-w-[720px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground py-2.5">Referrer</th>
                    <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground py-2.5">Type · Channel</th>
                    <th className="text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground py-2.5">Clicks</th>
                    <th className="text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground py-2.5">Signups</th>
                    <th className="text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground py-2.5">Impressions</th>
                    <th className="text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground py-2.5">Conv %</th>
                  </tr>
                </thead>
                <tbody>
                  {!ts.isLoading && topReferrers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-16 text-center text-muted-foreground text-sm">
                        No referral events yet — users get their unique share link after seeing their WhatDo result.
                      </td>
                    </tr>
                  )}
                  {(topReferrers.length ? topReferrers : Array.from({ length: 5 }).map((_, i) => ({
                    ownerId: `mock${i}`,
                    username: `user_${100 + i}`,
                    displayName: `User ${100 + i}`,
                    avatarUrl: null,
                    shareType: (["IDENTITY", "CHALLENGE", "TEMPLATE"] as const)[i % 3],
                    shareChannel: (["WHATSAPP", "INSTAGRAM", "COPY_LINK", "TWITTER"] as const)[i % 4],
                    clicks: 200 - i * 32,
                    signups: i === 0 ? 19 : 4 - (i % 3),
                    impressions: 2400 - i * 240,
                  }))).slice(0, 10).map((r, i) => {
                    const conv = r.clicks > 0 ? Math.round((r.signups / r.clicks) * 100) : 0;
                    return (
                      <tr key={r.ownerId + "r" + i} className="border-b border-border/60 last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="py-3 pr-2">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-fuchsia-500 via-violet-500 to-indigo-500 flex items-center justify-center text-white font-black text-xs shadow-sm flex-shrink-0">
                              {(r.displayName ?? r.username ?? "U").toString().charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-semibold truncate max-w-[240px]">
                                {r.displayName ?? r.username}
                              </div>
                              <p className="text-xs text-muted-foreground truncate max-w-[260px]">
                                @{r.username}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 pr-2">
                          <div className="flex flex-wrap gap-1">
                            <Badge size="sm" variant="info">{r.shareType}</Badge>
                            <Badge size="sm" variant="default">{r.shareChannel ?? "WEB"}</Badge>
                          </div>
                        </td>
                        <td className="py-3 pr-2 text-right text-sm tabular-nums">{formatNumber(r.clicks)}</td>
                        <td className="py-3 pr-2 text-right text-sm tabular-nums">
                          <span className={r.signups > 0 ? "text-emerald-500 font-bold" : ""}>
                            {formatNumber(r.signups)}
                          </span>
                        </td>
                        <td className="py-3 pr-2 text-right text-sm tabular-nums">{formatNumber(r.impressions)}</td>
                        <td className="py-3 pl-3 text-right text-sm tabular-nums font-bold">
                          {conv}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-danger" />
              Reports Requiring Attention
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Open reports aggregated by subject
            </p>
          </CardHeader>
          <CardContent className="pt-0 space-y-2.5">
            {(openReports.data?.items ?? Array.from({ length: 5 }).map((_, i) => ({
              id: `mock_${i}`,
              type: (["POST", "COMMENT", "USER"] as const)[i % 3],
              reason: (["SPAM", "HARASSMENT", "HATE", "NUDITY", "OTHER"] as const)[i % 5],
              status: "OPEN",
              createdAt: new Date(Date.now() - i * 3600_000 * 6),
              reporter: { username: `reporter_${i}`, avatarUrl: null },
              reportedPost: i % 2 === 0 ? { id: `p${i}`, question: "Suspicious post about crypto giveaway" } : null,
              reportedComment: i % 2 === 1 ? { id: `c${i}`, text: "This comment contains spam links to a scam site" } : null,
              reportedUser: i % 3 === 2 ? { id: `u${i}`, username: `suspicious_user_${i}`, avatarUrl: null } : null,
              count: 3 + i,
            }))).slice(0, 6).map((r: any) => {
              const target =
                r.type === "POST"
                  ? r.reportedPost?.question ?? "Post"
                  : r.type === "COMMENT"
                  ? r.reportedComment?.text ?? "Comment"
                  : `User: @${r.reportedUser?.username ?? "unknown"}`;
              return (
                <Link
                  key={r.id}
                  href="/admin/reports"
                  className="block p-3 rounded-xl border border-border bg-muted/30 hover:bg-muted/60 hover:border-primary/30 transition-all group"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge variant={r.reason === "HATE" || r.reason === "VIOLENCE" ? "danger" : r.reason === "SPAM" ? "warning" : "info"} size="sm">
                        {r.reason}
                      </Badge>
                      <Badge variant="default" size="sm">
                        {r.type}
                      </Badge>
                    </div>
                    <Badge variant="danger" size="sm">
                      ×{r.count ?? 3}
                    </Badge>
                  </div>
                  <p className="text-xs line-clamp-2 text-foreground/90 mb-1.5">
                    {String(target).slice(0, 120)}
                  </p>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>by @{r.reporter?.username ?? "anon"}</span>
                    <span className="tabular-nums">{formatRelativeTime(r.createdAt ?? new Date())}</span>
                  </div>
                </Link>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {quickActions.map((a) => {
              const Icon = a.icon;
              return (
                <Link
                  key={a.href}
                  href={a.href}
                  className="group p-4 rounded-xl border border-border hover:border-primary/30 hover:bg-muted/40 transition-all flex items-start gap-3"
                >
                  <div
                    className={`h-10 w-10 rounded-xl border flex items-center justify-center flex-shrink-0 ${a.color}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold group-hover:text-primary transition-colors">
                      {a.label}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {a.desc}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-1" />
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
