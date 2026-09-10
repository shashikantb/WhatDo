"use client";

import * as React from "react";
import {
  Megaphone,
  Plus,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  MousePointerClick,
  Eye as EyeIcon,
  LayoutList,
  RectangleHorizontal,
  Sparkles,
  PanelRight,
  AlertTriangle,
  X,
  Calendar,
  ArrowUpRight,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { useToast } from "@/components/design-system/Toaster";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/design-system/Card";
import { Badge } from "@/components/design-system/Badge";
import { Button } from "@/components/design-system/Button";
import { Input } from "@/components/design-system/Input";
import { Modal } from "@/components/design-system/Modal";
import { Textarea } from "@/components/design-system/Textarea";
import { Select } from "@/components/design-system/Select";
import { formatNumber } from "@/lib/utils";

type Placement = "FEED_EVERY_N" | "BANNER" | "SPONSORED_NATIVE" | "DESKTOP_SIDEBAR";

const PLACEMENT_META: Record<Placement, { label: string; desc: string; icon: any; color: string }> = {
  FEED_EVERY_N: {
    label: "Feed Inline",
    desc: "Injected every N posts in the main feed",
    icon: LayoutList,
    color: "bg-violet-500/15 border-violet-500/20 text-violet-500",
  },
  BANNER: {
    label: "Top Banner",
    desc: "Banner at the top of feed page",
    icon: RectangleHorizontal,
    color: "bg-emerald-500/15 border-emerald-500/20 text-emerald-500",
  },
  SPONSORED_NATIVE: {
    label: "Sponsored Native",
    desc: "Looks like a post, marked as Sponsored",
    icon: Sparkles,
    color: "bg-amber-500/15 border-amber-500/20 text-amber-500",
  },
  DESKTOP_SIDEBAR: {
    label: "Desktop Sidebar",
    desc: "Right rail on xl screens",
    icon: PanelRight,
    color: "bg-info/15 border-info/20 text-info",
  },
};

const EMPTY = {
  id: "",
  name: "",
  placement: "FEED_EVERY_N" as Placement,
  isEnabled: true,
  linkUrl: "",
  everyNPosts: 10,
  priority: 0,
  contentJson: {} as any,
  scheduleStart: "",
  scheduleEnd: "",
  budgetClicks: undefined as number | undefined,
};

export default function AdminAdsPage() {
  const { show } = useToast();
  const utils = trpc.useUtils();

  const [editorOpen, setEditorOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<any>(null);
  const [form, setForm] = React.useState<any>({ ...EMPTY });
  const [deleteAd, setDeleteAd] = React.useState<any>(null);

  const mut = trpc.admin.adsCrud.useMutation({
    onSuccess: () => {
      show("Ad saved", "success");
      setEditorOpen(false);
      setEditing(null);
    },
    onError: (err) => show(`Failed: ${err.message}`, "danger"),
  });
  const toggleMut = trpc.admin.adsCrud.useMutation({
    onSuccess: () => {
      show("Ad updated", "success");
    },
    onError: (err) => show(`Failed: ${err.message}`, "danger"),
  });
  const deleteMut = trpc.admin.adsCrud.useMutation({
    onSuccess: () => {
      show("Ad deleted", "success");
      setDeleteAd(null);
    },
    onError: (err) => show(`Failed: ${err.message}`, "danger"),
  });

  const seedAds: any[] = React.useMemo(
    () => [
      {
        id: "ad_1",
        placement: "FEED_EVERY_N",
        name: "Acme Corp — Feed Sponsored",
        isEnabled: true,
        linkUrl: "https://acme.example",
        priority: 5,
        everyNPosts: 10,
        clickCount: 3421,
        impressionCount: 48911,
        budgetClicks: 10000,
      },
      {
        id: "ad_2",
        placement: "BANNER",
        name: "WHATDO Premium Banner",
        isEnabled: false,
        linkUrl: "/pro",
        priority: 10,
        clickCount: 182,
        impressionCount: 12003,
        budgetClicks: undefined,
      },
      {
        id: "ad_3",
        placement: "SPONSORED_NATIVE",
        name: "LaunchDarkly — Native Ad",
        isEnabled: true,
        linkUrl: "https://launchdarkly.example",
        priority: 2,
        clickCount: 512,
        impressionCount: 18293,
        budgetClicks: 2000,
      },
      {
        id: "ad_4",
        placement: "DESKTOP_SIDEBAR",
        name: "Sidebar — Brand partner",
        isEnabled: true,
        linkUrl: "https://partner.example",
        priority: 0,
        clickCount: 98,
        impressionCount: 5500,
        budgetClicks: undefined,
      },
    ],
    []
  );

  const allAds = seedAds;

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY });
    setEditorOpen(true);
  };
  const openEdit = (a: any) => {
    setEditing(a);
    setForm({
      id: a.id,
      name: a.name,
      placement: a.placement,
      isEnabled: !!a.isEnabled,
      linkUrl: a.linkUrl ?? "",
      everyNPosts: a.everyNPosts ?? 10,
      priority: a.priority ?? 0,
      contentJson: a.contentJson ?? {},
      scheduleStart: a.scheduleStart ? a.scheduleStart.slice(0, 16) : "",
      scheduleEnd: a.scheduleEnd ? a.scheduleEnd.slice(0, 16) : "",
      budgetClicks: a.budgetClicks,
    });
    setEditorOpen(true);
  };

  const submitForm = () => {
    if (!form.name || !form.placement) {
      show("Name and placement are required", "warning");
      return;
    }
    const payload: any = {
      operation: editing ? "update" : "create",
      id: editing?.id,
      name: form.name,
      placement: form.placement,
      isEnabled: !!form.isEnabled,
      linkUrl: form.linkUrl || undefined,
      everyNPosts: Number(form.everyNPosts ?? 10),
      priority: Number(form.priority ?? 0),
      contentJson: form.contentJson,
      budgetClicks: form.budgetClicks ? Number(form.budgetClicks) : undefined,
      scheduleStart: form.scheduleStart ? new Date(form.scheduleStart) : undefined,
      scheduleEnd: form.scheduleEnd ? new Date(form.scheduleEnd) : undefined,
    };
    mut.mutate(payload);
  };

  const handleToggle = (a: any) => {
    toggleMut.mutate({
      operation: "update",
      id: a.id,
      isEnabled: !a.isEnabled,
    });
  };

  const handleDelete = () => {
    if (!deleteAd) return;
    deleteMut.mutate({ operation: "delete", id: deleteAd.id });
  };

  const placements: Placement[] = ["FEED_EVERY_N", "BANNER", "SPONSORED_NATIVE", "DESKTOP_SIDEBAR"];

  return (
    <div className="space-y-5 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center">
            <Megaphone className="h-6 w-6 text-emerald-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Ads</h1>
            <p className="text-sm text-muted-foreground">
              {allAds.length} ad placements · monetization & promotions
            </p>
          </div>
        </div>
        <Button onClick={openCreate} leftIcon={<Plus className="h-4 w-4" />}>
          Create new ad
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {placements.map((placement) => {
          const meta = PLACEMENT_META[placement];
          const Icon: any = meta.icon;
          const adsForPlacement = allAds.filter((a) => a.placement === placement);
          return (
            <Card key={placement} className="overflow-hidden">
              <CardHeader className={`flex flex-row items-start justify-between border-b border-border ${meta.color.replace("bg-", "bg-[color:var(--card)] ").replace("/15", "/[0.05]")}`}>
                <div className="flex items-start gap-3">
                  <div className={`h-11 w-11 rounded-xl border flex items-center justify-center ${meta.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{meta.label}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">{meta.desc}</p>
                  </div>
                </div>
                <Badge variant="default" size="sm">
                  {adsForPlacement.length} configured
                </Badge>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                {adsForPlacement.length === 0 && (
                  <div className="p-6 text-center border border-dashed border-border rounded-xl">
                    <p className="text-xs text-muted-foreground mb-2">
                      No ads for this placement yet
                    </p>
                    <Button variant="ghost" size="sm" onClick={openCreate}>
                      <Plus className="h-3.5 w-3.5 mr-1.5" /> Add one
                    </Button>
                  </div>
                )}
                {adsForPlacement.map((a) => {
                  const ctr =
                    a.impressionCount > 0
                      ? ((a.clickCount / a.impressionCount) * 100).toFixed(2)
                      : "0.00";
                  const budgetRemaining =
                    a.budgetClicks ? Math.max(0, a.budgetClicks - a.clickCount) : null;
                  return (
                    <div
                      key={a.id}
                      className="p-4 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold truncate flex-1 min-w-0">
                              {a.name}
                            </p>
                            {a.isEnabled ? (
                              <Badge variant="success" size="sm">Live</Badge>
                            ) : (
                              <Badge variant="default" size="sm">Paused</Badge>
                            )}
                          </div>
                          {a.linkUrl && (
                            <a
                              href={a.linkUrl.startsWith("http") ? a.linkUrl : undefined}
                              target={a.linkUrl.startsWith("http") ? "_blank" : undefined}
                              rel="noreferrer"
                              className="text-[11px] text-primary inline-flex items-center gap-0.5 hover:underline mt-1 truncate max-w-full"
                            >
                              {a.linkUrl}
                              {a.linkUrl.startsWith("http") && <ArrowUpRight className="h-3 w-3 flex-shrink-0" />}
                            </a>
                          )}
                        </div>
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => handleToggle(a)}
                            className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-card hover:text-foreground transition-colors"
                            title={a.isEnabled ? "Pause" : "Enable"}
                          >
                            {a.isEnabled ? (
                              <ToggleRight className="h-4 w-4 text-success" />
                            ) : (
                              <ToggleLeft className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => openEdit(a)}
                            className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-card hover:text-foreground transition-colors"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteAd(a)}
                            className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-card hover:text-danger transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                            <EyeIcon className="h-3 w-3" /> Impr.
                          </div>
                          <p className="text-sm font-semibold tabular-nums">
                            {formatNumber(a.impressionCount ?? 0)}
                          </p>
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                            <MousePointerClick className="h-3 w-3" /> Clicks
                          </div>
                          <p className="text-sm font-semibold tabular-nums">
                            {formatNumber(a.clickCount ?? 0)}
                          </p>
                        </div>
                        <div>
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                            CTR
                          </div>
                          <p className="text-sm font-semibold tabular-nums">{ctr}%</p>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-border/60 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span>Priority: <span className="font-semibold text-foreground">{a.priority ?? 0}</span></span>
                          {placement === "FEED_EVERY_N" && (
                            <span>Every <span className="font-semibold text-foreground">{a.everyNPosts ?? 10}</span> posts</span>
                          )}
                        </div>
                        {a.budgetClicks ? (
                          <span className="inline-flex items-center gap-1">
                            Budget: <span className="font-semibold text-foreground">{formatNumber(budgetRemaining ?? 0)}</span> / {formatNumber(a.budgetClicks)} clicks
                          </span>
                        ) : (
                          <span className="text-muted-foreground/70">No click budget</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Modal
        open={editorOpen}
        onClose={() => !mut.isPending && setEditorOpen(false)}
        title={editing ? "Edit ad" : "Create new ad"}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditorOpen(false)} disabled={mut.isPending}>Cancel</Button>
            <Button variant="primary" loading={mut.isPending} onClick={submitForm}>
              {editing ? "Save changes" : "Create ad"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Ad name"
              value={form.name}
              onChange={(e) => setForm((f: any) => ({ ...f, name: e.target.value }))}
              placeholder="Spring campaign — Feed"
            />
            <Select
              label="Placement"
              value={form.placement}
              onChange={(v) => setForm((f: any) => ({ ...f, placement: v }))}
              options={Object.entries(PLACEMENT_META).map(([value, m]) => ({ value, label: `${m.label} — ${m.desc.slice(0, 30)}${m.desc.length > 30 ? "…" : ""}` }))}
            />
          </div>
          <Input
            label="Destination URL"
            value={form.linkUrl}
            onChange={(e) => setForm((f: any) => ({ ...f, linkUrl: e.target.value }))}
            placeholder="https://example.com or /internal-route"
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Priority"
              type="number"
              value={form.priority}
              onChange={(e) => setForm((f: any) => ({ ...f, priority: Number(e.target.value) || 0 }))}
              helperText="Higher = served first"
            />
            {form.placement === "FEED_EVERY_N" && (
              <Input
                label="Every N posts"
                type="number"
                value={form.everyNPosts}
                onChange={(e) => setForm((f: any) => ({ ...f, everyNPosts: Math.max(1, Number(e.target.value) || 10) }))}
              />
            )}
            <Input
              label="Click budget (optional)"
              type="number"
              value={form.budgetClicks ?? ""}
              onChange={(e) =>
                setForm((f: any) => ({
                  ...f,
                  budgetClicks: e.target.value ? Number(e.target.value) : undefined,
                }))
              }
              helperText="Pause after N clicks"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Schedule start (optional)"
              type="datetime-local"
              value={form.scheduleStart}
              onChange={(e) => setForm((f: any) => ({ ...f, scheduleStart: e.target.value }))}
              leftIcon={<Calendar className="h-4 w-4" />}
            />
            <Input
              label="Schedule end (optional)"
              type="datetime-local"
              value={form.scheduleEnd}
              onChange={(e) => setForm((f: any) => ({ ...f, scheduleEnd: e.target.value }))}
              leftIcon={<Calendar className="h-4 w-4" />}
            />
          </div>
          <Textarea
            label="Ad content / payload (JSON)"
            value={JSON.stringify(form.contentJson ?? {}, null, 2)}
            onChange={(e) => {
              try {
                setForm((f: any) => ({ ...f, contentJson: JSON.parse(e.target.value || "{}") }));
              } catch {
              }
            }}
            rows={5}
            placeholder='{"title": "Try Acme!", "body": "Ship faster"}'
            helperText="Raw JSON — stored as contentJson"
          />
          <div>
            <p className="text-sm font-medium mb-2">Status</p>
            <button
              type="button"
              onClick={() => setForm((f: any) => ({ ...f, isEnabled: !f.isEnabled }))}
              className="h-10 px-3 rounded-lg border border-border w-full flex items-center justify-between hover:bg-muted/50 transition-colors"
            >
              <span className="text-sm">
                {form.isEnabled ? "Enabled — will be served" : "Paused — not served"}
              </span>
              {form.isEnabled ? (
                <ToggleRight className="h-5 w-5 text-success" />
              ) : (
                <ToggleLeft className="h-5 w-5 text-muted-foreground" />
              )}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!deleteAd}
        onClose={() => !deleteMut.isPending && setDeleteAd(null)}
        title={`Delete "${deleteAd?.name ?? "ad"}"?`}
        description="This ad configuration will be permanently removed. Analytics are retained."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteAd(null)} disabled={deleteMut.isPending}>Cancel</Button>
            <Button variant="danger" loading={deleteMut.isPending} onClick={handleDelete} leftIcon={<Trash2 className="h-4 w-4" />}>
              Delete ad
            </Button>
          </>
        }
      >
        <div className="flex items-start gap-3 p-3 rounded-xl bg-danger/10 border border-danger/20">
          <AlertTriangle className="h-5 w-5 text-danger flex-shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            This action cannot be undone. If this ad is live, traffic will stop immediately.
          </p>
        </div>
      </Modal>
    </div>
  );
}
