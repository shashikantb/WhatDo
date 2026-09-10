"use client";

import * as React from "react";
import Link from "next/link";
import {
  Flag,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  User as UserIcon,
  FileText,
  MessageSquare,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  Shield,
  Clock,
  ShieldCheck,
  AlertTriangle,
  UserCheck,
  ChevronDown,
  GripVertical,
  ShieldX,
  UserX,
  Ban,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { useToast } from "@/components/design-system/Toaster";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/design-system/Card";
import { Badge } from "@/components/design-system/Badge";
import { Button } from "@/components/design-system/Button";
import { Input } from "@/components/design-system/Input";
import { Select } from "@/components/design-system/Select";
import { Modal } from "@/components/design-system/Modal";
import { Textarea } from "@/components/design-system/Textarea";
import { Avatar } from "@/components/design-system/Avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/design-system/Tabs";
import { formatNumber, formatRelativeTime } from "@/lib/utils";
import { useSession } from "next-auth/react";

const REASONS = ["SPAM", "HARASSMENT", "HATE", "NUDITY", "VIOLENCE", "SCAM", "MISINFORMATION", "COPYRIGHT", "OTHER"] as const;
const STATUSES = ["OPEN", "UNDER_REVIEW", "RESOLVED", "DISMISSED"] as const;
const TYPES = ["POST", "COMMENT", "USER", "ALL"] as const;

const reasonVariant: Record<string, any> = {
  SPAM: "warning",
  HARASSMENT: "danger",
  HATE: "danger",
  NUDITY: "danger",
  VIOLENCE: "danger",
  SCAM: "warning",
  MISINFORMATION: "warning",
  COPYRIGHT: "info",
  OTHER: "default",
};

const statusVariant: Record<string, any> = {
  OPEN: "danger",
  UNDER_REVIEW: "warning",
  RESOLVED: "success",
  DISMISSED: "default",
};

const RESOLUTION_OPTIONS = [
  { value: "NO_ACTION", label: "No action taken", icon: CheckCircle, color: "text-muted-foreground" },
  { value: "WARNING", label: "Warning issued to user", icon: AlertTriangle, color: "text-warning" },
  { value: "CONTENT_HIDDEN", label: "Content hidden", icon: Eye, color: "text-warning" },
  { value: "CONTENT_REMOVED", label: "Content removed", icon: ShieldX, color: "text-danger" },
  { value: "USER_SUSPENDED", label: "User suspended", icon: Ban, color: "text-warning" },
  { value: "USER_BANNED", label: "User banned", icon: UserX, color: "text-danger" },
];

export default function AdminReportsPage() {
  const { data: session } = useSession();
  const { show } = useToast();
  const utils = trpc.useUtils();

  const [tab, setTab] = React.useState<(typeof STATUSES)[number]>("OPEN");
  const [typeFilter, setTypeFilter] = React.useState<(typeof TYPES)[number]>("ALL");
  const [assignedFilter, setAssignedFilter] = React.useState<"all" | "me" | "unassigned">("all");
  const [reasonFilter, setReasonFilter] = React.useState<string>("ALL");
  const [cursor, setCursor] = React.useState<string | undefined>(undefined);
  const [prevCursors, setPrevCursors] = React.useState<string[]>([]);

  const [resolveReport, setResolveReport] = React.useState<any>(null);
  const [resolveChoice, setResolveChoice] = React.useState<string>("NO_ACTION");
  const [resolveNote, setResolveNote] = React.useState("");
  const [dismissReport, setDismissReport] = React.useState<any>(null);
  const [dismissNote, setDismissNote] = React.useState("");

  const list = trpc.reports.list.useQuery(
    {
      status: tab === "ALL" ? undefined : tab,
      type: typeFilter === "ALL" ? undefined : (typeFilter as any),
      cursor,
      limit: 50,
    },
    { keepPreviousData: true, staleTime: 15_000, refetchInterval: 60_000 }
  );

  const resolveMut = trpc.reports.resolve.useMutation({
    onSuccess: () => {
      void utils.reports.list.invalidate();
      void utils.admin.dashboardStats.invalidate();
      show("Report updated", "success");
      setResolveReport(null);
      setDismissReport(null);
      setResolveNote("");
      setDismissNote("");
      setResolveChoice("NO_ACTION");
    },
    onError: (err) => show(`Failed: ${err.message}`, "danger"),
  });

  const assignSelf = (report: any) => {
    if (!session?.user?.id) return;
    resolveMut.mutate({
      id: report.id,
      action: "ASSIGN",
      assignedModeratorId: session.user.id,
    });
  };

  const submitResolve = (action: "RESOLVE" | "DISMISS") => {
    const report = action === "RESOLVE" ? resolveReport : dismissReport;
    const note = action === "RESOLVE" ? resolveNote : dismissNote;
    if (!report) return;
    resolveMut.mutate({ id: report.id, action, note: note || undefined });
  };

  const goNext = () => {
    if (list.data?.nextCursor) {
      setPrevCursors((p) => (cursor ? [...p, cursor] : p));
      setCursor(list.data.nextCursor);
    }
  };
  const goPrev = () => {
    setPrevCursors((p) => {
      const next = [...p];
      const last = next.pop();
      setCursor(last);
      return next;
    });
  };
  const resetPagination = () => {
    setCursor(undefined);
    setPrevCursors([]);
  };
  React.useEffect(() => {
    resetPagination();
  }, [tab, typeFilter, assignedFilter, reasonFilter]);

  const pageItemsAll: any[] = list.data?.items ?? [];
  const pageItems = pageItemsAll.filter((r) => {
    if (assignedFilter === "me") return r.assignedModeratorId === session?.user?.id;
    if (assignedFilter === "unassigned") return !r.assignedModeratorId;
    return true;
  }).filter((r) => {
    if (reasonFilter === "ALL") return true;
    return r.reason === reasonFilter;
  });

  return (
    <div className="space-y-5 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-warning/15 border border-warning/20 flex items-center justify-center">
            <Flag className="h-6 w-6 text-warning" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Moderation Queue</h1>
            <p className="text-sm text-muted-foreground">
              Review reports and resolve content violations
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <TabsList className="w-full lg:w-auto overflow-x-auto">
                {STATUSES.map((s) => (
                  <TabsTrigger key={s} value={s} className="flex-shrink-0">
                    {s.replace("_", " ")}
                  </TabsTrigger>
                ))}
              </TabsList>
              <div className="flex flex-wrap gap-2 justify-end">
                <div className="w-[130px]">
                  <Select
                    value={typeFilter}
                    onChange={(v) => setTypeFilter(v as any)}
                    options={TYPES.map((t) => ({ value: t, label: t === "ALL" ? "All types" : t }))}
                    placeholder="Type"
                  />
                </div>
                <div className="w-[150px]">
                  <Select
                    value={assignedFilter}
                    onChange={(v) => setAssignedFilter(v as any)}
                    options={[
                      { value: "all", label: "All reports" },
                      { value: "me", label: "Assigned to me" },
                      { value: "unassigned", label: "Unassigned" },
                    ]}
                    placeholder="Assignment"
                  />
                </div>
                <div className="w-[160px]">
                  <Select
                    value={reasonFilter}
                    onChange={(v) => setReasonFilter(v)}
                    options={[
                      { value: "ALL", label: "All reasons" },
                      ...REASONS.map((r) => ({ value: r, label: r })),
                    ]}
                    placeholder="Reason"
                  />
                </div>
              </div>
            </div>
          </Tabs>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          {list.isLoading &&
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-4 rounded-xl border border-border bg-muted/30">
                <div className="h-6 bg-muted/80 rounded w-1/3 mb-3 animate-pulse" />
                <div className="h-4 bg-muted/60 rounded w-full mb-2 animate-pulse" />
                <div className="h-4 bg-muted/60 rounded w-5/6 animate-pulse" />
              </div>
            ))}

          {!list.isLoading && pageItems.length === 0 && (
            <div className="py-20 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="h-16 w-16 rounded-2xl bg-success/10 border border-success/20 flex items-center justify-center">
                  <ShieldCheck className="h-8 w-8 text-success" />
                </div>
                <p className="text-base font-semibold">All clear in this queue</p>
                <p className="text-sm text-muted-foreground max-w-md">
                  No reports match the current filters. Great job keeping the community safe!
                </p>
              </div>
            </div>
          )}

          {pageItems.map((r) => {
            const target =
              r.type === "POST"
                ? r.reportedPost
                : r.type === "COMMENT"
                ? r.reportedComment
                : r.reportedUser;

            const count = (r as any).count ?? 1;

            return (
              <div
                key={r.id}
                className="p-4 md:p-5 rounded-xl border border-border bg-card hover:border-primary/30 transition-colors"
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={statusVariant[r.status] ?? "default"} size="sm">
                        {r.status.replace("_", " ")}
                      </Badge>
                      <Badge variant={reasonVariant[r.reason] ?? "default"} size="sm">
                        {r.reason}
                      </Badge>
                      <Badge variant="default" size="sm">
                        {r.type === "POST" ? (
                          <><FileText className="h-3 w-3 mr-1" /> Post</>
                        ) : r.type === "COMMENT" ? (
                          <><MessageSquare className="h-3 w-3 mr-1" /> Comment</>
                        ) : (
                          <><UserIcon className="h-3 w-3 mr-1" /> User</>
                        )}
                      </Badge>
                      {count > 1 && (
                        <Badge variant="danger" size="sm">
                          ×{count} reports
                        </Badge>
                      )}
                      {r.assignedModerator?.username && (
                        <Badge variant="info" size="sm">
                          <UserCheck className="h-3 w-3 mr-1" />
                          @{r.assignedModerator.username}
                        </Badge>
                      )}
                    </div>

                    <div className="p-3 rounded-lg bg-muted/40 border border-border">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                        Reported {r.type.toLowerCase()}
                      </div>
                      {r.type === "POST" && (
                        <Link
                          href={`/post/${r.reportedPost?.id ?? "#"}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm line-clamp-3 font-medium hover:text-primary transition-colors"
                        >
                          {r.reportedPost?.question ?? "(Post unavailable)"}
                        </Link>
                      )}
                      {r.type === "COMMENT" && (
                        <p className="text-sm line-clamp-4 text-foreground/90 whitespace-pre-wrap">
                          {r.reportedComment?.text ?? "(Comment unavailable)"}
                        </p>
                      )}
                      {r.type === "USER" && (
                        <div className="flex items-center gap-2.5">
                          <Avatar
                            avatarUrl={r.reportedUser?.avatarUrl}
                            displayName={r.reportedUser?.username ?? "user"}
                            username={r.reportedUser?.username ?? "user"}
                            size="sm"
                          />
                          <div>
                            <p className="text-sm font-semibold">
                              @{r.reportedUser?.username ?? "unknown"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Reported account
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {r.details && (
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                          Reporter notes
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 italic">
                          &ldquo;{r.details}&rdquo;
                        </p>
                      </div>
                    )}

                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-1">
                      <div className="flex items-center gap-1.5">
                        <Avatar
                          avatarUrl={r.reporter?.avatarUrl}
                          displayName={r.reporter?.username}
                          username={r.reporter?.username}
                          size="xs"
                        />
                        <span>by @{r.reporter?.username ?? "anon"}</span>
                      </div>
                      <span>·</span>
                      <span className="tabular-nums">
                        {formatRelativeTime(r.createdAt)}
                      </span>
                      <span>·</span>
                      <code className="font-mono">#{r.id.slice(0, 8)}</code>
                    </div>
                  </div>

                  <div className="flex md:flex-col md:items-stretch gap-2 flex-wrap md:gap-1.5 md:w-[200px]">
                    {tab === "OPEN" && !r.assignedModeratorId && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => assignSelf(r)}
                        disabled={resolveMut.isPending}
                        leftIcon={<UserCheck className="h-4 w-4" />}
                        className="md:w-full"
                      >
                        Assign to me
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                      className="md:w-full"
                    >
                      <Link
                        href={
                          r.type === "POST"
                            ? `/post/${r.reportedPost?.id ?? "#"}`
                            : r.type === "USER"
                            ? `/profile/${r.reportedUser?.username ?? "#"}`
                            : `/post/${r.reportedPost?.id ?? "#"}`
                        }
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Eye className="h-4 w-4 mr-1.5" />
                        View content
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setDismissReport(r);
                      }}
                      disabled={resolveMut.isPending}
                      leftIcon={<XCircle className="h-4 w-4" />}
                      className="md:w-full"
                    >
                      Dismiss
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setResolveReport(r);
                      }}
                      disabled={resolveMut.isPending}
                      leftIcon={<CheckCircle className="h-4 w-4" />}
                      className="md:w-full"
                    >
                      Resolve
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}

          <div className="flex items-center justify-between pt-4 mt-2 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Showing {pageItems.length} reports
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={goPrev}
                disabled={prevCursors.length === 0}
                leftIcon={<ChevronLeft className="h-4 w-4" />}
              >
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={goNext}
                disabled={!list.data?.hasMore}
                rightIcon={<ChevronRight className="h-4 w-4" />}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Modal
        open={!!resolveReport}
        onClose={() => !resolveMut.isPending && setResolveReport(null)}
        title="Resolve report"
        description="Choose the appropriate resolution action for this report."
        size="lg"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setResolveReport(null)}
              disabled={resolveMut.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={resolveMut.isPending}
              onClick={() => submitResolve("RESOLVE")}
              leftIcon={<CheckCircle className="h-4 w-4" />}
            >
              Submit resolution
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <div>
            <p className="text-sm font-semibold mb-2.5">Action taken</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {RESOLUTION_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const active = resolveChoice === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setResolveChoice(opt.value)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      active
                        ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary/30"
                        : "border-border hover:border-primary/30 hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${active ? "" : opt.color}`} />
                      <span className="text-sm font-medium leading-tight">{opt.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          <Textarea
            label="Moderator notes (optional)"
            value={resolveNote}
            onChange={(e) => setResolveNote(e.target.value)}
            placeholder="Document the moderation decision..."
            rows={4}
            helperText={`${resolveNote.length}/2000 characters`}
          />
        </div>
      </Modal>

      <Modal
        open={!!dismissReport}
        onClose={() => !resolveMut.isPending && setDismissReport(null)}
        title="Dismiss report"
        description="This report will be marked as dismissed with no further action."
        size="md"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setDismissReport(null)}
              disabled={resolveMut.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              loading={resolveMut.isPending}
              onClick={() => submitResolve("DISMISS")}
              leftIcon={<XCircle className="h-4 w-4" />}
            >
              Dismiss report
            </Button>
          </>
        }
      >
        <Textarea
          label="Dismissal notes (optional)"
          value={dismissNote}
          onChange={(e) => setDismissNote(e.target.value)}
          placeholder="Why is this report being dismissed?"
          rows={3}
          helperText={`${dismissNote.length}/2000 characters`}
        />
      </Modal>
    </div>
  );
}
