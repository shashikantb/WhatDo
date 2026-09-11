"use client";

import * as React from "react";
import {
  Search,
  FileText,
  Search as SearchIcon,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Eye,
  ShieldCheck,
  EyeOff,
  Trash2,
  Star,
  Flag,
  ExternalLink,
  Image as ImageIcon,
  AlertTriangle,
  Clock,
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
import { formatNumber, formatRelativeTime } from "@/lib/utils";

const statusVariant: Record<string, any> = {
  PUBLISHED: "success",
  PENDING_MODERATION: "warning",
  HIDDEN: "default",
  REMOVED: "danger",
  CLOSED: "info",
  DRAFT: "default",
};

export default function AdminPostsPage() {
  const { show } = useToast();
  const utils = trpc.useUtils();

  const [search, setSearch] = React.useState("");
  const [searchDeb, setSearchDeb] = React.useState("");
  const [categoryId, setCategoryId] = React.useState<string | undefined>(undefined);
  const [statusFilter, setStatusFilter] = React.useState<
    "ALL" | "PUBLISHED" | "PENDING_MODERATION" | "HIDDEN" | "REMOVED" | "FEATURED" | "CLOSED"
  >("ALL");
  const [sortBy, setSortBy] = React.useState<"newest" | "engagement" | "reports">("newest");
  const [cursor, setCursor] = React.useState<string | undefined>(undefined);
  const [prevCursors, setPrevCursors] = React.useState<string[]>([]);
  const [rowMenu, setRowMenu] = React.useState<string | null>(null);

  const [removePost, setRemovePost] = React.useState<any>(null);
  const [removeReason, setRemoveReason] = React.useState("");

  React.useEffect(() => {
    const t = setTimeout(() => setSearchDeb(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const categories = trpc.categories.listAll.useQuery();

  const listStatus: any =
    statusFilter === "FEATURED" ? "ALL" : statusFilter;

  const list = trpc.admin.postsList.useQuery(
    {
      categoryId,
      status: listStatus,
      search: searchDeb || undefined,
      sortBy,
      cursor,
      limit: 50,
    },
    { staleTime: 30_000 }
  );

  const moderateMut = trpc.admin.postsModerate.useMutation({
    onSuccess: () => {
      void utils.admin.postsList.invalidate();
      void utils.admin.dashboardStats.invalidate();
      show("Post moderation action applied", "success");
      setRemovePost(null);
      setRemoveReason("");
    },
    onError: (err) => show(`Failed: ${err.message}`, "danger"),
  });

  const runAction = (id: string, action: "APPROVE" | "HIDE" | "REMOVE" | "FEATURE" | "UNFEATURE", reason?: string) => {
    moderateMut.mutate({ id, action, reason });
  };

  const submitRemove = () => {
    if (!removePost) return;
    runAction(removePost.id, "REMOVE", removeReason || undefined);
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
  }, [searchDeb, categoryId, statusFilter, sortBy]);

  const pageItems: any[] = list.data?.items ?? [];
  const filteredByFeatured =
    statusFilter === "FEATURED"
      ? pageItems.filter((p) => p.isFeatured)
      : pageItems;

  return (
    <div className="space-y-5 max-w-[1800px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-violet-500/15 border border-violet-500/20 flex items-center justify-center">
            <FileText className="h-6 w-6 text-violet-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Posts</h1>
            <p className="text-sm text-muted-foreground">
              Review, moderate, feature, or remove posts
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3 w-full">
            <div className="flex-1 min-w-0">
              <Input
                placeholder="Search post ID or question..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<SearchIcon className="h-4 w-4" />}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="w-[170px]">
                <Select
                  value={categoryId ?? ""}
                  onChange={(v) => setCategoryId(v || undefined)}
                  options={[
                    { value: "", label: "All categories" },
                    ...(categories.data ?? []).map((c: any) => ({ value: c.id, label: c.name })),
                  ]}
                  placeholder="Category"
                />
              </div>
              <div className="w-[180px]">
                <Select
                  value={statusFilter}
                  onChange={(v) => setStatusFilter(v as any)}
                  options={[
                    { value: "ALL", label: "All statuses" },
                    { value: "PUBLISHED", label: "Published" },
                    { value: "PENDING_MODERATION", label: "Pending review" },
                    { value: "HIDDEN", label: "Hidden" },
                    { value: "REMOVED", label: "Removed" },
                    { value: "FEATURED", label: "Featured" },
                    { value: "CLOSED", label: "Closed" },
                  ]}
                  placeholder="Status"
                />
              </div>
              <div className="w-[170px]">
                <Select
                  value={sortBy}
                  onChange={(v) => setSortBy(v as any)}
                  options={[
                    { value: "newest", label: "Newest" },
                    { value: "engagement", label: "Top votes" },
                    { value: "reports", label: "Most reported" },
                  ]}
                  placeholder="Sort by"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full min-w-[1200px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground py-2.5 w-[72px]">
                    ID
                  </th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground py-2.5">
                    Question
                  </th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground py-2.5 w-[120px]">
                    Creator
                  </th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground py-2.5 w-[110px]">
                    Category
                  </th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground py-2.5 w-[110px]">
                    Status
                  </th>
                  <th className="text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground py-2.5 w-[70px]">
                    Media
                  </th>
                  <th className="text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground py-2.5 w-[70px]">
                    Votes
                  </th>
                  <th className="text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground py-2.5 w-[80px]">
                    Comments
                  </th>
                  <th className="text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground py-2.5 w-[80px]">
                    Reports
                  </th>
                  <th className="text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground py-2.5 w-[50px]">
                    <Star className="h-3.5 w-3.5" />
                  </th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground py-2.5 w-[110px]">
                    Created
                  </th>
                  <th className="text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground py-2.5 w-[80px] pl-4">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {list.isLoading &&
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="border-b border-border/60 last:border-0">
                      <td colSpan={12} className="py-6">
                        <div className="h-10 bg-muted/60 rounded-lg animate-pulse" />
                      </td>
                    </tr>
                  ))}
                {!list.isLoading && filteredByFeatured.length === 0 && (
                  <tr>
                    <td colSpan={12} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="h-12 w-12 rounded-2xl bg-muted border border-border flex items-center justify-center">
                          <FileText className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <p className="text-sm text-muted-foreground">No posts match these filters</p>
                      </div>
                    </td>
                  </tr>
                )}
                {filteredByFeatured.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-border/60 last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="py-3 pr-2">
                      <code className="text-[10px] font-mono text-muted-foreground tabular-nums bg-muted px-1.5 py-0.5 rounded">
                        {p.id.slice(0, 8)}…
                      </code>
                    </td>
                    <td className="py-3 pr-2 max-w-[360px]">
                      <p className="text-sm leading-snug line-clamp-2 font-medium">
                        {p.question}
                      </p>
                    </td>
                    <td className="py-3 pr-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar
                          avatarUrl={p.creator?.avatarUrl}
                          displayName={p.creator?.displayName ?? p.creator?.username}
                          username={p.creator?.username}
                          size="sm"
                        />
                        <span className="text-xs text-muted-foreground truncate">
                          @{p.creator?.username}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 pr-2 text-xs text-muted-foreground truncate max-w-[120px]">
                      {p.category?.name ?? "—"}
                    </td>
                    <td className="py-3 pr-2">
                      <Badge variant={statusVariant[p.status] ?? "default"} size="sm">
                        {p.status.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="py-3 pr-2 text-center">
                      {Array.isArray(p.media) && p.media.length > 0 ? (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <ImageIcon className="h-3.5 w-3.5" aria-hidden={true} />
                        {p.media.length}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground/60">—</span>
                    )}
                    </td>
                    <td className="py-3 pr-2 text-right text-sm tabular-nums">
                      {formatNumber(p._count?.votes ?? p.voteCount ?? 0)}
                    </td>
                    <td className="py-3 pr-2 text-right text-sm tabular-nums">
                      {formatNumber(p._count?.comments ?? p.commentCount ?? 0)}
                    </td>
                    <td className="py-3 pr-2 text-center">
                      {p._count?.reports > 0 ? (
                        <Badge variant="danger" size="sm">
                          <Flag className="h-3 w-3 mr-1" />
                          {p._count.reports}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">0</span>
                      )}
                    </td>
                    <td className="py-3 pr-2 text-center">
                      {p.isFeatured ? (
                        <Star className="h-4 w-4 text-amber-500 fill-amber-500 inline-block mx-auto" />
                      ) : (
                        <span className="text-xs text-muted-foreground/60">·</span>
                      )}
                    </td>
                    <td className="py-3 pr-2 text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                      {formatRelativeTime(p.createdAt)}
                    </td>
                    <td className="py-3 pl-4 text-right relative">
                      <div className="relative inline-block">
                        <button
                          type="button"
                          onClick={() => setRowMenu(rowMenu === p.id ? null : p.id)}
                          className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                        {rowMenu === p.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setRowMenu(null)} />
                            <div className="absolute right-0 top-full mt-1 z-20 w-56 rounded-lg border border-border bg-card shadow-popover animate-scaleIn p-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setRowMenu(null);
                                  window.open(`/post/${p.id}`, "_blank");
                                }}
                                className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm hover:bg-muted"
                              >
                                <ExternalLink className="h-4 w-4" />
                                Preview post
                              </button>
                              {p.status === "PENDING_MODERATION" && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRowMenu(null);
                                    runAction(p.id, "APPROVE");
                                  }}
                                  disabled={moderateMut.isPending}
                                  className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm hover:bg-muted text-success"
                                >
                                  <ShieldCheck className="h-4 w-4" />
                                  Approve / Publish
                                </button>
                              )}
                              {p.status !== "HIDDEN" && p.status !== "REMOVED" && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRowMenu(null);
                                    runAction(p.id, "HIDE");
                                  }}
                                  disabled={moderateMut.isPending}
                                  className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm hover:bg-muted text-warning"
                                >
                                  <EyeOff className="h-4 w-4" />
                                  Hide post
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setRowMenu(null);
                                  setRemovePost(p);
                                }}
                                className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm hover:bg-danger/10 text-danger"
                              >
                                <Trash2 className="h-4 w-4" />
                                Remove post
                              </button>
                              <div className="border-t border-border my-1" />
                              {!p.isFeatured ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRowMenu(null);
                                    runAction(p.id, "FEATURE");
                                  }}
                                  disabled={moderateMut.isPending}
                                  className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm hover:bg-muted text-amber-500"
                                >
                                  <Star className="h-4 w-4" />
                                  Feature post
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRowMenu(null);
                                    runAction(p.id, "UNFEATURE");
                                  }}
                                  disabled={moderateMut.isPending}
                                  className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm hover:bg-muted"
                                >
                                  <Star className="h-4 w-4" />
                                  Unfeature
                                </button>
                              )}
                              {p._count?.reports > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRowMenu(null);
                                    window.location.href = "/admin/reports";
                                  }}
                                  className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm hover:bg-muted text-info"
                                >
                                  <Flag className="h-4 w-4" />
                                  View reports ({p._count.reports})
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-5 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Showing {filteredByFeatured.length} posts per page
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
                disabled={!list.data?.hasMore || statusFilter === "FEATURED"}
                rightIcon={<ChevronRight className="h-4 w-4" />}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Modal
        open={!!removePost}
        onClose={() => !moderateMut.isPending && setRemovePost(null)}
        title="Remove post?"
        description="This post will be permanently removed from public view. It will no longer appear in feeds or search results."
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setRemovePost(null)} disabled={moderateMut.isPending}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={moderateMut.isPending}
              onClick={submitRemove}
              leftIcon={<Trash2 className="h-4 w-4" />}
            >
              Remove post
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 rounded-xl bg-danger/10 border border-danger/20">
            <AlertTriangle className="h-5 w-5 text-danger flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-foreground">
                Content is being removed</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Provide a reason for your records.
              </p>
            </div>
          </div>
          <Textarea
            label="Reason (optional)"
            value={removeReason}
            onChange={(e) => setRemoveReason(e.target.value)}
            placeholder="Explain why this post is being removed..."
            rows={4}
            helperText={`${removeReason.length}/500 characters`}
          />
        </div>
      </Modal>
    </div>
  );
}
