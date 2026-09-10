"use client";

import * as React from "react";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Trophy,
  Search,
  Loader2,
  Check,
  AlertTriangle,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { useToast } from "@/components/design-system/Toaster";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/design-system/Card";
import { Badge } from "@/components/design-system/Badge";
import { Button } from "@/components/design-system/Button";
import { Input } from "@/components/design-system/Input";
import { Select } from "@/components/design-system/Select";
import { formatRelativeTime, formatNumber } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/design-system/Tabs";

type PredictionStatus = "ALL" | "OPEN" | "CLOSED" | "RESOLVED";

function StatusBadge({ status }: { status: PredictionStatus }) {
  if (status === "RESOLVED") {
    return (
      <Badge variant="success" size="sm">
        <CheckCircle2 className="w-3 h-3 mr-1" /> Resolved
      </Badge>
    );
  }
  if (status === "CLOSED") {
    return (
      <Badge variant="warning" size="sm">
        <Clock className="w-3 h-3 mr-1" /> Awaiting resolution
      </Badge>
    );
  }
  return (
    <Badge variant="info" size="sm">
      <Clock className="w-3 h-3 mr-1" /> Open
    </Badge>
  );
}

export default function AdminPredictionsPage() {
  const { show } = useToast();
  const utils = trpc.useUtils();
  const [tab, setTab] = React.useState<PredictionStatus>("ALL");
  const [search, setSearch] = React.useState("");
  const [selectedOptions, setSelectedOptions] = React.useState<Record<string, string>>({});
  const [resolvingId, setResolvingId] = React.useState<string | null>(null);

  const query = trpc.admin.predictionsList.useInfiniteQuery(
    { status: tab, limit: 25 },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      staleTime: 30_000,
    },
  );

  const items = React.useMemo(
    () => (query.data?.pages ?? []).flatMap((p) => p.items ?? []),
    [query.data],
  );

  const filtered = React.useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter((p: any) =>
      p.post?.question?.toLowerCase().includes(q) ||
      p.post?.creator?.username?.toLowerCase().includes(q),
    );
  }, [items, search]);

  const resolveMut = trpc.admin.resolvePrediction.useMutation({
    onSuccess: () => {
      show("Prediction resolved! Voters notified.", "success");
      setSelectedOptions((o) => {
        const n = { ...o };
        delete n[resolvingId ?? ""];
        return n;
      });
      setResolvingId(null);
      void utils.admin.predictionsList.invalidate();
      void utils.feed.getForYou.invalidate();
      void utils.users.getPredictions.invalidate();
    },
    onError: (e) => {
      show(`Failed: ${e.message}`, "danger");
      setResolvingId(null);
    },
  });

  const handleResolve = (prediction: any) => {
    const optId = selectedOptions[prediction.id];
    if (!optId) {
      show("Select a correct option first", "warning");
      return;
    }
    setResolvingId(prediction.id);
    resolveMut.mutate({
      predictionId: prediction.id,
      correctOptionId: optId,
    });
  };

  const computeStatus = (p: any): PredictionStatus => {
    if (p.isResolved) return "RESOLVED";
    const now = new Date();
    if (p.closingTime && new Date(p.closingTime) <= now) return "CLOSED";
    return "OPEN";
  };

  return (
    <div className="space-y-5 max-w-[1400px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-warning/15 border border-warning/20 flex items-center justify-center">
            <Trophy className="h-6 w-6 text-warning" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Prediction Resolver</h1>
            <p className="text-sm text-muted-foreground">
              Close and mark correct outcomes for prediction polls.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="flex-1 md:w-80">
            <Input
              placeholder="Search predictions or creators..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search className="h-4 w-4" />}
            />
          </div>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as PredictionStatus)}>
        <TabsList className="w-full overflow-x-auto flex-wrap h-auto p-1">
          <TabsTrigger value="ALL" className="inline-flex items-center gap-1.5">
            All
          </TabsTrigger>
          <TabsTrigger value="OPEN" className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" /> Open
          </TabsTrigger>
          <TabsTrigger value="CLOSED" className="inline-flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" /> Awaiting Resolution
          </TabsTrigger>
          <TabsTrigger value="RESOLVED" className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" /> Resolved
          </TabsTrigger>
        </TabsList>

        {(["ALL", "OPEN", "CLOSED", "RESOLVED"] as PredictionStatus[]).map((t) => (
          <TabsContent key={t} value={t} className="pt-4">
            {query.isLoading && filtered.length === 0 && (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i} className="p-4">
                    <div className="h-5 w-2/3 bg-muted animate-pulse rounded mb-3" />
                    <div className="h-4 w-1/2 bg-muted animate-pulse rounded" />
                  </Card>
                ))}
              </div>
            )}

            {!query.isLoading && filtered.length === 0 && (
              <Card>
                <CardContent className="py-16 text-center">
                  <div className="mx-auto h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
                    <Trophy className="h-7 w-7 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold">No predictions match</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Create prediction posts to see them here.
                  </p>
                </CardContent>
              </Card>
            )}

            {filtered.map((p: any) => {
              const status = computeStatus(p);
              const creator = p.post?.creator;
              return (
                <Card key={p.id} className="overflow-hidden mb-3">
                  <CardContent className="p-4 md:p-5 space-y-4">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <StatusBadge status={status} />
                          <span className="text-xs text-muted-foreground">
                            {formatRelativeTime(p.createdAt ?? p.post?.createdAt ?? new Date())}
                          </span>
                          {p.correctOption && (
                            <Badge variant="success" size="sm">
                              <Check className="w-3 h-3 mr-1" />
                              Answer: {p.correctOption.label}
                            </Badge>
                          )}
                        </div>
                        <h3 className="font-semibold leading-snug text-foreground">
                          {p.post?.question}
                        </h3>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>@{creator?.username ?? "unknown"}</span>
                          <span>·</span>
                          <span className="tabular-nums">
                            {formatNumber(p.post?.voteCount ?? 0)} votes
                          </span>
                          {p.closingTime && (
                            <>
                              <span>·</span>
                              <span>
                                {status === "OPEN" ? "Closes " : "Closed "}
                                {formatRelativeTime(p.closingTime)}
                              </span>
                            </>
                          )}
                          {p.resolvedAt && (
                            <>
                              <span>·</span>
                              <span>
                                Resolved {formatRelativeTime(p.resolvedAt)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {!(p.isResolved || (status as PredictionStatus) === "RESOLVED") && (
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-border">
                        <div className="flex-1 sm:max-w-md">
                          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                            Correct outcome
                          </label>
                          <Select
                            value={selectedOptions[p.id] ?? ""}
                            onChange={(value: string) =>
                              setSelectedOptions((o) => ({
                                ...o,
                                [p.id]: value,
                              }))
                            }
                            options={(p.options ?? []).map((o: any) => ({
                              value: o.id,
                              label: o.label,
                            }))}
                            placeholder="Choose the correct option..."
                          />
                        </div>
                        <div className="flex justify-start sm:justify-end">
                          <Button
                            variant="primary"
                            onClick={() => handleResolve(p)}
                            loading={resolveMut.isPending && resolvingId === p.id}
                            leftIcon={<CheckCircle2 className="h-4 w-4" />}
                            disabled={p.isResolved || (status as PredictionStatus) === "RESOLVED"}
                          >
                            Resolve Prediction
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}

            {query.hasNextPage && filtered.length > 0 && (
              <div className="py-4 text-center">
                <Button
                  variant="outline"
                  onClick={() => void query.fetchNextPage()}
                  loading={query.isFetchingNextPage}
                >
                  {query.isFetchingNextPage ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    "Load more"
                  )}
                </Button>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
