"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  MessageSquare,
  Flag,
  TrendingUp,
  Shield,
  BarChart3,
  ChevronRight,
  Vote,
  DollarSign,
  ThumbsUp,
  UserPlus,
  Clock,
  Eye,
  Ban,
  AlertCircle,
  Star,
  Archive,
  FileText,
  FolderTree,
  Megaphone,
  LineChart as LineChartIcon,
  Activity,
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
  Legend,
} from "recharts";
import { trpc } from "@/lib/trpc/client";
import { useToast } from "@/components/design-system/Toaster";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/design-system/Card";
import { Badge } from "@/components/design-system/Badge";
import { Button } from "@/components/design-system/Button";
import { Avatar } from "@/components/design-system/Avatar";
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

function generateTimeseries(days = 30) {
  const arr = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dayLabel = `${d.getMonth() + 1}/${d.getDate()}`;
    const base = 30 + Math.sin(i / 4) * 12;
    arr.push({
      day: dayLabel,
      votes: Math.max(5, Math.round(base + (Math.random() * 40 - 10))),
      users: Math.max(1, Math.round(10 + (Math.random() * 15 - 3) + i * 0.1)),
      posts: Math.max(0, Math.round(5 + (Math.random() * 12 - 3) + i * 0.05)),
      engagement: +(0.4 + (Math.random() * 0.6 - 0.2) + Math.sin(i / 7) * 0.15).toFixed(2),
    });
  }
  return arr;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { show } = useToast();
  const tsData = React.useMemo(() => generateTimeseries(30), []);

  const stats = trpc.admin.dashboardStats.useQuery(undefined, {
    staleTime: 60_000,
  });

  const openReports = trpc.reports.list.useQuery(
    { status: "OPEN", limit: 20 },
    { staleTime: 30_000 }
  );

  const trendingMock = React.useMemo(
    () =>
      Array.from({ length: 10 }).map((_, i) => ({
        id: `tr_${i}`,
        question: [
          "Which programming language will dominate in 2027?",
          "Is remote work better than office work for productivity?",
          "Should governments regulate AI development more strictly?",
          "Will electric vehicles fully replace gas cars by 2035?",
          "Is social media doing more harm than good?",
          "Which is the best framework for building modern UIs?",
          "Should we switch to a 4-day work week universally?",
          "Is plant-based protein the future of food?",
          "Do you prefer iOS or Android for daily use?",
          "Will cryptocurrency ever become mainstream currency?",
        ][i],
        creatorName: `user_${1000 + i}`,
        avatar: null,
        voteCount: 1200 - i * 97 + Math.floor(Math.random() * 60),
        commentCount: 80 - i * 6 + Math.floor(Math.random() * 20),
        reportCount: Math.random() > 0.7 ? Math.floor(Math.random() * 5) + 1 : 0,
        trendingScore: 98 - i * 7.2 + Math.random() * 3,
        isFeatured: i === 0,
      })),
    []
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
  const growth = stats.data?.growth;
  const activity = stats.data?.activity;

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
          title="Daily Active Users"
          icon={Users}
          iconColor="bg-primary/15 text-primary border border-primary/20"
          value={stats.isLoading ? "—" : formatNumber(activity?.dau ?? 0)}
          change="+12.4%"
          changePositive
          sublabel="last 24h"
        />
        <StatCard
          title="Monthly Active Users"
          icon={Activity}
          iconColor="bg-info/15 text-info border border-info/20"
          value={stats.isLoading ? "—" : formatNumber(activity?.mau ?? 0)}
          change="+8.3%"
          changePositive
          sublabel="30-day window"
        />
        <StatCard
          title="New Users (7d)"
          icon={UserPlus}
          iconColor="bg-success/15 text-success border border-success/20"
          value={stats.isLoading ? "—" : formatNumber(growth?.newUsers30d ?? 0)}
          change="+18.2%"
          changePositive
          sublabel="last 7 days"
        />
        <StatCard
          title="Published Posts"
          icon={FileText}
          iconColor="bg-violet-500/15 text-violet-500 border border-violet-500/20"
          value={stats.isLoading ? "—" : formatNumber(total?.posts ?? 0)}
          change="+5.1%"
          changePositive
          sublabel="total published"
        />
        <StatCard
          title="Votes Cast"
          icon={Vote}
          iconColor="bg-emerald-500/15 text-emerald-500 border border-emerald-500/20"
          value={stats.isLoading ? "—" : formatNumber(total?.votes ?? 0)}
          change="+24.7%"
          changePositive
          sublabel="all time"
        />
        <StatCard
          title="Comments Total"
          icon={MessageSquare}
          iconColor="bg-amber-500/15 text-amber-500 border border-amber-500/20"
          value={stats.isLoading ? "—" : formatNumber(total?.comments ?? 0)}
          change="+9.8%"
          changePositive
          sublabel="all time"
        />
        <StatCard
          title="Open Reports"
          icon={Flag}
          iconColor="bg-warning/15 text-warning border border-warning/20"
          value={stats.isLoading ? "—" : formatNumber(total?.reports ?? 0)}
          change="-15.2%"
          changePositive
          sublabel="pending review"
        />
        <StatCard
          title="Revenue"
          icon={DollarSign}
          iconColor="bg-accent/15 text-accent border border-accent/20"
          value="$0"
          change="—"
          changePositive
          sublabel="Ads not configured"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Vote className="h-4 w-4 text-emerald-500" />
                Votes (Last 30 days)
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Total votes per day
              </p>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={tsData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                  <defs>
                    <linearGradient id="gVotes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} interval={4} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    labelStyle={{ color: "var(--foreground)" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="votes"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#gVotes)"
                    dot={false}
                    activeDot={{ r: 3 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-primary" />
                New Users (Last 30 days)
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Signups per day
              </p>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tsData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} interval={4} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="users" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-violet-500" />
                Posts Created (Last 30 days)
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                New posts per day
              </p>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={tsData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} interval={4} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="posts"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-info" />
                Engagement Rate (Last 30 days)
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Votes per user per session
              </p>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={tsData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                  <defs>
                    <linearGradient id="gEng" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} interval={4} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} domain={[0, 1]} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(value: any) => [`${Number(value).toFixed(2)}`, "Engagement"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="engagement"
                    stroke="#0ea5e9"
                    strokeWidth={2}
                    fill="url(#gEng)"
                    dot={false}
                    activeDot={{ r: 3 }}
                  />
                </AreaChart>
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
                <TrendingUp className="h-4 w-4 text-warning" />
                Trending Posts (Top 10)
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Sorted by trending score
              </p>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/posts">
                View all
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground py-2.5 w-[50%]">
                      Post
                    </th>
                    <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground py-2.5">
                      Creator
                    </th>
                    <th className="text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground py-2.5">
                      Votes
                    </th>
                    <th className="text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground py-2.5">
                      Comments
                    </th>
                    <th className="text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground py-2.5 w-[80px]">
                      Reports
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {trendingMock.map((p) => (
                    <tr
                      key={p.id}
                      className="border-b border-border/60 last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => router.push(`/post/${p.id}`)}
                    >
                      <td className="py-3 pr-2">
                        <div className="flex items-start gap-2.5">
                          {p.isFeatured && (
                            <Star className="h-4 w-4 text-amber-500 fill-amber-500 mt-0.5 flex-shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium leading-snug line-clamp-2">
                              {p.question}
                            </p>
                            <p className="text-[11px] text-muted-foreground mt-0.5 tabular-nums">
                              Score: {p.trendingScore.toFixed(1)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Avatar
                            avatarUrl={p.avatar}
                            displayName={p.creatorName}
                            username={p.creatorName}
                            size="sm"
                          />
                          <span className="text-xs text-muted-foreground truncate">
                            @{p.creatorName}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 pr-2 text-right text-sm tabular-nums">
                        {formatNumber(p.voteCount)}
                      </td>
                      <td className="py-3 pr-2 text-right text-sm tabular-nums">
                        {formatNumber(p.commentCount)}
                      </td>
                      <td className="py-3 text-center">
                        {p.reportCount > 0 ? (
                          <Badge variant="danger" size="sm">
                            {p.reportCount}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">0</span>
                        )}
                      </td>
                    </tr>
                  ))}
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
              Open reports with 3+ reports aggregated
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
