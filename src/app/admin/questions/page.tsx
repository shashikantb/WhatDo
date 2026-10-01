"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { QuestionStatus, QuestionTaxonomy, PostType } from "@prisma/client";
import { trpc } from "@/lib/trpc/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/design-system/Card";
import { Button } from "@/components/design-system/Button";
import { Input } from "@/components/design-system/Input";
import { Badge } from "@/components/design-system/Badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/design-system/Tabs";
import { Select } from "@/components/design-system/Select";
import { useToast } from "@/components/design-system/Toaster";
import {
  ChevronRight,
  Eye,
  Check,
  XCircle,
  Loader2,
  Send,
  Archive,
  Sparkles,
  Search,
  Flame,
  Plus,
  TrendingUp,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_TABS = [
  { key: "ALL", label: "All" },
  { key: "DRAFT", label: "Drafts" },
  { key: "PENDING_APPROVAL", label: "Pending" },
  { key: "APPROVED", label: "Approved" },
  { key: "PUBLISHED", label: "Published" },
  { key: "CLOSED", label: "Closed" },
  { key: "REJECTED", label: "Rejected" },
];

const BADGE_CLS: Record<string, string> = {
  DRAFT: "bg-slate-500/15 text-slate-600 border-slate-200",
  AI_REVIEW: "bg-sky-500/10 text-sky-700 border-sky-200",
  PENDING_APPROVAL: "bg-amber-500/10 text-amber-700 border-amber-200",
  APPROVED: "bg-indigo-500/10 text-indigo-700 border-indigo-200",
  SCHEDULED: "bg-violet-500/10 text-violet-700 border-violet-200",
  PUBLISHED: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  CLOSED: "bg-zinc-500/10 text-zinc-700 border-zinc-200",
  REJECTED: "bg-rose-500/10 text-rose-700 border-rose-200",
  ARCHIVED: "bg-slate-500/10 text-slate-600 border-slate-200",
};

export default function AdminQuestionsPage() {
  const router = useRouter();
  const { show } = useToast();
  const utils = trpc.useUtils();
  const [tab, setTab] = React.useState<string>("ALL");
  const [category, setCategory] = React.useState<string>("ALL");
  const [search, setSearch] = React.useState("");
  const [take] = React.useState(50);
  const [skip, setSkip] = React.useState(0);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [genBusy, setGenBusy] = React.useState(false);
  const [trendOpen, setTrendOpen] = React.useState(false);

  const query = trpc.adminQuestions.list.useQuery(
    {
      status: tab === "ALL" ? undefined : (tab as QuestionStatus),
      category: category === "ALL" ? undefined : (category as QuestionTaxonomy),
      search: search.trim() || undefined,
      skip,
      take,
    },
    { refetchOnMount: true, staleTime: 0 },
  );
  const summary = trpc.adminQuestions.summaryStats.useQuery(undefined, {
    staleTime: 30_000,
  });

  const approve = trpc.adminQuestions.approve.useMutation();
  const reject = trpc.adminQuestions.reject.useMutation();
  const publish = trpc.adminQuestions.publish.useMutation();
  const close = trpc.adminQuestions.close.useMutation();
  const similar = trpc.adminQuestions.generateSimilar.useMutation();
  const trending = trpc.adminQuestions.generateTrendingDraft.useMutation();

  const rows = query.data?.rows ?? [];
  const total = query.data?.total ?? 0;

  const runAction = async (
    id: string,
    kind: "approve" | "reject" | "publish" | "close" | "similar",
  ) => {
    setBusyId(id + ":" + kind);
    try {
      let msg = "Done";
      if (kind === "approve") {
        await approve.mutateAsync({ id });
        msg = "Question approved.";
      } else if (kind === "reject") {
        await reject.mutateAsync({ id });
        msg = "Question rejected.";
      } else if (kind === "publish") {
        await publish.mutateAsync({ id });
        msg = "Question published live.";
      } else if (kind === "close") {
        await close.mutateAsync({ id });
        msg = "Question closed.";
      } else {
        const r = await similar.mutateAsync({ id, count: 3 });
        msg = `Created ${r.drafts.length} similar drafts.`;
      }
      show(msg, "success");
      await utils.adminQuestions.list.invalidate();
      await utils.adminQuestions.summaryStats.invalidate();
    } catch (e: any) {
      show(e?.message ?? "Something failed.", "danger");
    } finally {
      setBusyId(null);
    }
  };

  const handleGenTrends = async () => {
    setGenBusy(true);
    try {
      const r = await trending.mutateAsync({ count: 8 });
      show(`Created ${r.drafts.length} trending draft questions.`, "success");
      setTrendOpen(false);
      setTab("DRAFT");
      await utils.adminQuestions.list.invalidate();
      await utils.adminQuestions.summaryStats.invalidate();
    } catch (e: any) {
      show(e?.message ?? "Failed", "danger");
    } finally {
      setGenBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">
            WhatDo Assessment Questions
          </h1>
          <p className="text-sm text-muted-foreground">
            Review, approve, and seed the 10–15 question pool users see on
            the home hero.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/admin/analytics/whatdo">
            <Button size="md" variant="outline">
              <TrendingUp className="h-4 w-4 mr-1.5" /> Funnel analytics
            </Button>
          </Link>
          <Button
            size="md"
            variant="outline"
            onClick={() => setTrendOpen(true)}
          >
            <Sparkles className="h-4 w-4 mr-1.5" /> Generate trending drafts
          </Button>
          <Link href="/admin/settings#content">
            <Button size="md" variant="outline">
              <FileText className="h-4 w-4 mr-1.5" /> Content controls
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Published (live to users)
            </p>
            <p className="mt-1 text-2xl font-black tracking-tight">
              {summary.data?.publishedQuestions ?? "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              WhatDo identities computed
            </p>
            <p className="mt-1 text-2xl font-black tracking-tight">
              {(summary.data?.identities ?? 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Crowdsourced answer responses
            </p>
            <p className="mt-1 text-2xl font-black tracking-tight">
              {(summary.data?.responses ?? 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Referrals clicked · signed up · completed
            </p>
            <p className="mt-1 text-lg font-black tracking-tight">
              {summary.data?.sharers?.clickedCount ?? 0} ·{" "}
              {summary.data?.sharers?.signups ?? 0} ·{" "}
              {summary.data?.sharers?.completions ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <CardTitle className="text-base font-bold">
            Question library · {total.toLocaleString()} total
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search question text…"
                className="pl-9 md:w-80"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setSkip(0);
                }}
              />
            </div>
            <Select
              value={category}
              onChange={(v) => {
                setCategory(v);
                setSkip(0);
              }}
              className="md:w-44"
              options={[
                { value: "ALL", label: "All categories" },
                ...Object.values(QuestionTaxonomy).map((t) => ({
                  value: t,
                  label: t.replaceAll("_", " "),
                })),
              ]}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={tab} onValueChange={(t) => { setTab(t); setSkip(0); }}>
            <TabsList className="flex flex-wrap gap-1 bg-transparent p-0 h-auto">
              {STATUS_TABS.map((t) => (
                <TabsTrigger
                  key={t.key}
                  value={t.key}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-[11.5px] font-bold",
                    tab === t.key
                      ? "bg-foreground text-background border-transparent"
                      : "bg-background text-muted-foreground border-border hover:bg-accent/40",
                  )}
                >
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {query.isFetching && !query.data ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
              Loading questions…
            </div>
          ) : rows.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              <Flame className="h-6 w-6 mx-auto mb-2 text-amber-500/80" />
              Nothing in this view yet.
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 md:mx-0 md:overflow-visible">
              <table className="min-w-[900px] w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    <th className="py-2 pr-3 font-bold">Status</th>
                    <th className="py-2 pr-3 font-bold">Question</th>
                    <th className="py-2 pr-3 font-bold">Category · Type</th>
                    <th className="py-2 pr-3 font-bold">Meta</th>
                    <th className="py-2 pr-3 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((q: any) => (
                    <tr
                      key={q.id}
                      className="border-t border-border/60 hover:bg-accent/20 transition-colors"
                    >
                      <td className="py-3 pr-3 align-top w-[130px]">
                        <Badge
                          className={cn(
                            "rounded-full border text-[10.5px] font-black uppercase tracking-widest",
                            BADGE_CLS[q.status] ?? BADGE_CLS.DRAFT,
                          )}
                        >
                          {q.status.replaceAll("_", " ")}
                        </Badge>
                      </td>
                      <td className="py-3 pr-3 align-top">
                        <p className="font-semibold text-[14px] leading-snug line-clamp-2">
                          {q.questionText}
                        </p>
                        {q.subcategory && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {String(q.subcategory).replaceAll("_", " ")}
                          </p>
                        )}
                        <p className="mt-1.5 text-[11px] text-muted-foreground">
                          {q.options?.length ?? 0} options · created{" "}
                          {new Date(q.createdAt).toLocaleDateString()}
                        </p>
                      </td>
                      <td className="py-3 pr-3 align-top w-[180px]">
                        <Badge className="rounded-full bg-indigo-500/10 text-indigo-700 border-indigo-200">
                          {String(q.category).replaceAll("_", " ")}
                        </Badge>
                        <p className="mt-1.5 text-[11px] font-semibold text-muted-foreground">
                          {String(q.answerType).replaceAll("_", " ")}
                        </p>
                      </td>
                      <td className="py-3 pr-3 align-top w-[170px] text-xs text-muted-foreground">
                        {q.targetCity && (
                          <p className="font-semibold">📍 {q.targetCity}</p>
                        )}
                        <p>
                          Selected {q.timesSelected ?? 0}× · voted{" "}
                          {q.voteCount ?? 0}×
                        </p>
                        {q.aiGenerated ? (
                          <p className="mt-0.5">🤖 AI draft</p>
                        ) : null}
                      </td>
                      <td className="py-3 pr-3 align-top w-[260px]">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          {(q.status === "DRAFT" ||
                            q.status === "PENDING_APPROVAL" ||
                            q.status === "AI_REVIEW") && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => runAction(q.id, "approve")}
                                disabled={busyId === q.id + ":approve"}
                              >
                                <Check className="h-3.5 w-3.5" /> Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => runAction(q.id, "publish")}
                                disabled={busyId === q.id + ":publish"}
                              >
                                <Send className="h-3.5 w-3.5" /> Publish
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => runAction(q.id, "similar")}
                                disabled={busyId === q.id + ":similar"}
                              >
                                <Plus className="h-3.5 w-3.5" /> 3× similar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-rose-600 border-rose-200 hover:bg-rose-50"
                                onClick={() => runAction(q.id, "reject")}
                                disabled={busyId === q.id + ":reject"}
                              >
                                <XCircle className="h-3.5 w-3.5" /> Reject
                              </Button>
                            </>
                          )}
                          {(q.status === "APPROVED" ||
                            q.status === "SCHEDULED") && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => runAction(q.id, "publish")}
                                disabled={busyId === q.id + ":publish"}
                              >
                                <Send className="h-3.5 w-3.5" /> Publish
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-rose-600 border-rose-200 hover:bg-rose-50"
                                onClick={() => runAction(q.id, "reject")}
                                disabled={busyId === q.id + ":reject"}
                              >
                                <XCircle className="h-3.5 w-3.5" /> Reject
                              </Button>
                            </>
                          )}
                          {q.status === "PUBLISHED" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => runAction(q.id, "close")}
                                disabled={busyId === q.id + ":close"}
                              >
                                <Archive className="h-3.5 w-3.5" /> Close
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => runAction(q.id, "similar")}
                                disabled={busyId === q.id + ":similar"}
                              >
                                <Plus className="h-3.5 w-3.5" /> Spin 3
                              </Button>
                            </>
                          )}
                          {q.status === "CLOSED" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => runAction(q.id, "publish")}
                              disabled={busyId === q.id + ":publish"}
                            >
                              <ChevronRight className="h-3.5 w-3.5" /> Re-publish
                            </Button>
                          )}
                          {q.status === "REJECTED" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => runAction(q.id, "approve")}
                              disabled={busyId === q.id + ":approve"}
                            >
                              <Eye className="h-3.5 w-3.5" /> Re-review
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-muted-foreground">
              Showing {rows.length} · Total {total.toLocaleString()}
            </p>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSkip((s) => Math.max(0, s - take))}
                disabled={skip <= 0 || query.isFetching}
              >
                Prev
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSkip((s) => s + take)}
                disabled={skip + take >= total || query.isFetching}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {trendOpen && (
        <TrendingModal
          busy={genBusy}
          onCancel={() => setTrendOpen(false)}
          onGenerate={handleGenTrends}
        />
      )}
    </div>
  );
}

function TrendingModal({
  busy,
  onCancel,
  onGenerate,
}: {
  busy: boolean;
  onCancel: () => void;
  onGenerate: () => Promise<void>;
}) {
  const ideas = [
    "Do you think AI will replace 30%+ of entry-level jobs by 2028?",
    "₹10,000 unexpected bonus — what do you do first?",
    "Short-form video vs. long-form reading — which shapes your opinions more?",
    "Would you quit social media for 6 months for ₹50,000?",
    "Is renting a home better than buying right now in your city?",
    "Remote work vs. office — which makes you MORE productive?",
    "Should college education be free in India?",
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="w-full max-w-xl rounded-3xl bg-background border border-border shadow-2xl animate-scaleIn">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black tracking-tight">
              Generate trending WhatDo drafts
            </h3>
            <p className="text-xs text-muted-foreground">
              Creates 8 scaffold DRAFT questions. Review then approve → publish.
            </p>
          </div>
          <Button size="sm" variant="ghost" onClick={onCancel}>
            Close
          </Button>
        </div>
        <div className="p-5 space-y-2 max-h-[48vh] overflow-y-auto">
          {ideas.map((t, i) => (
            <p
              key={t}
              className="text-sm text-muted-foreground rounded-2xl bg-muted/50 border border-border px-3.5 py-2.5"
            >
              <span className="font-black text-foreground mr-2">#{i + 1}</span>
              {t}
            </p>
          ))}
        </div>
        <div className="p-5 border-t border-border flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            If OPENAI_API_KEY or UPSTASH are blank, scaffold drafts are used.
          </p>
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" size="md" onClick={onCancel}>
              Cancel
            </Button>
            <Button size="md" onClick={onGenerate} disabled={busy}>
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> Creating
                  drafts…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-1.5" /> Create 8 drafts
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
