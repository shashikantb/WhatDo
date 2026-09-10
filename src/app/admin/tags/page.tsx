"use client";

import * as React from "react";
import {
  Tags,
  Pencil,
  Trash2,
  Plus,
  Search,
  Search as SearchIcon,
  AlertTriangle,
  Merge,
  ChevronLeft,
  ChevronRight,
  X,
  Hash,
  Filter,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { useToast } from "@/components/design-system/Toaster";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/design-system/Card";
import { Badge } from "@/components/design-system/Badge";
import { Button } from "@/components/design-system/Button";
import { Input } from "@/components/design-system/Input";
import { Modal } from "@/components/design-system/Modal";
import { Select } from "@/components/design-system/Select";
import { formatNumber, formatRelativeTime } from "@/lib/utils";

const EMPTY = { id: "", name: "", slug: "", categoryId: "" };

export default function AdminTagsPage() {
  const { show } = useToast();
  const utils = trpc.useUtils();

  const [search, setSearch] = React.useState("");
  const [minCount, setMinCount] = React.useState<string>("0");
  const [cursor, setCursor] = React.useState<string | undefined>(undefined);
  const [prevCursors, setPrevCursors] = React.useState<string[]>([]);

  const [editorOpen, setEditorOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<any>(null);
  const [form, setForm] = React.useState<any>({ ...EMPTY });

  const [deleteTag, setDeleteTag] = React.useState<any>(null);
  const [mergeOpen, setMergeOpen] = React.useState(false);
  const [mergeFrom, setMergeFrom] = React.useState<any>(null);
  const [mergeIntoId, setMergeIntoId] = React.useState<string>("");

  const categories = trpc.categories.listAll.useQuery();

  const mockTags: any[] = React.useMemo(
    () =>
      Array.from({ length: 60 }).map((_, i) => ({
        id: `tag_${i}`,
        name: [
          "ai", "tech", "webdev", "react", "startups", "remote", "gaming",
          "ai-safety", "design", "ux", "productivity", "fitness", "travel",
          "politics", "news", "esports", "music", "movies", "crypto",
          "iphone", "android", "cars", "vegan", "pets", "parenting",
        ][i % 25] + (i > 24 ? `-${i}` : ""),
        slug: "",
        postCount: Math.floor(Math.random() * 800),
        categoryId: (categories.data ?? [])[i % Math.max(1, (categories.data ?? []).length)]?.id ?? undefined,
        createdAt: new Date(Date.now() - i * 86400_000 * 3),
      })),
    [categories.data]
  );

  const createMut = trpc.admin.tagsCrud.useMutation({
    onSuccess: () => {
      show("Tag saved", "success");
      setEditorOpen(false);
    },
    onError: (err) => show(`Failed: ${err.message}`, "danger"),
  });

  const deleteMut = trpc.admin.tagsCrud.useMutation({
    onSuccess: () => {
      show("Tag deleted", "success");
      setDeleteTag(null);
    },
    onError: (err) => show(`Failed: ${err.message}`, "danger"),
  });

  const allTags = mockTags;
  const filtered = allTags.filter((t) => {
    if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
    const minN = Number(minCount) || 0;
    if (t.postCount < minN) return false;
    return true;
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY });
    setEditorOpen(true);
  };
  const openEdit = (t: any) => {
    setEditing(t);
    setForm({ id: t.id, name: t.name, slug: t.slug ?? t.name.toLowerCase(), categoryId: t.categoryId ?? "" });
    setEditorOpen(true);
  };

  const submitForm = () => {
    if (!form.name) {
      show("Tag name is required", "warning");
      return;
    }
    if (editing) {
      createMut.mutate({
        operation: "update",
        id: editing.id,
        name: form.name,
        slug: form.slug || form.name.toLowerCase().replace(/\s+/g, "-"),
        categoryId: form.categoryId || undefined,
      });
    } else {
      createMut.mutate({
        operation: "create",
        name: form.name,
        slug: form.slug || form.name.toLowerCase().replace(/\s+/g, "-"),
        categoryId: form.categoryId || undefined,
      });
    }
  };

  const handleDelete = () => {
    if (!deleteTag) return;
    deleteMut.mutate({ operation: "delete", id: deleteTag.id });
  };

  const handleMerge = () => {
    if (!mergeFrom || !mergeIntoId || mergeFrom.id === mergeIntoId) {
      show("Select a different target tag", "warning");
      return;
    }
    show(`Merged #${mergeFrom.name} into target (mock)`, "success");
    setMergeOpen(false);
    setMergeFrom(null);
    setMergeIntoId("");
  };

  const perPage = 50;
  const current = (cursor
    ? filtered.slice(filtered.findIndex((t) => t.id === cursor) + 1)
    : filtered
  ).slice(0, perPage);
  const hasMore = (cursor
    ? filtered.slice(filtered.findIndex((t) => t.id === cursor) + 1 + perPage).length > 0
    : filtered.slice(perPage).length > 0);
  const nextCursor = current[current.length - 1]?.id;
  const goNext = () => hasMore && setCursor(nextCursor);
  const goPrev = () => {
    setPrevCursors((p) => {
      const next = [...p];
      const last = next.pop();
      setCursor(last);
      return next;
    });
  };
  const reset = () => {
    setCursor(undefined);
    setPrevCursors([]);
  };
  React.useEffect(() => reset(), [search, minCount]);

  return (
    <div className="space-y-5 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-violet-500/15 border border-violet-500/20 flex items-center justify-center">
            <Tags className="h-6 w-6 text-violet-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Tags</h1>
            <p className="text-sm text-muted-foreground">
              {formatNumber(filtered.length)} tags · organize and merge taxonomy
            </p>
          </div>
        </div>
        <Button onClick={openCreate} leftIcon={<Plus className="h-4 w-4" />}>
          New tag
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <div className="flex-1 min-w-0">
              <Input
                placeholder="Search tag name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<SearchIcon className="h-4 w-4" />}
              />
            </div>
            <div className="w-[180px] flex-shrink-0">
              <Input
                type="number"
                placeholder="Min post count"
                value={minCount}
                onChange={(e) => setMinCount(e.target.value)}
                leftIcon={<Filter className="h-4 w-4" />}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full min-w-[720px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground py-2.5 w-[35%]">
                    Tag
                  </th>
                  <th className="text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground py-2.5 w-[100px]">
                    Posts
                  </th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground py-2.5 w-[25%]">
                    Category
                  </th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground py-2.5 w-[120px]">
                    Created
                  </th>
                  <th className="text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground py-2.5 pl-4 w-[180px]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {current.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-16 text-center">
                      <p className="text-sm text-muted-foreground">No tags match these filters</p>
                    </td>
                  </tr>
                )}
                {current.map((t) => {
                  const cat: any = (categories.data ?? []).find((c: any) => c.id === t.categoryId);
                  return (
                    <tr key={t.id} className="border-b border-border/60 last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="py-3 pr-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Hash className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate">#{t.name}</p>
                            <p className="text-xs text-muted-foreground">/{t.slug ?? t.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-2 text-right text-sm font-medium tabular-nums">
                        {formatNumber(t.postCount)}
                      </td>
                      <td className="py-3 pr-2">
                        {cat ? (
                          <Badge variant="category" size="sm" style={cat.color ? { background: `${cat.color}15`, borderColor: `${cat.color}30`, color: cat.color } : undefined}>
                            {cat.name}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-3 pr-2 text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                        {formatRelativeTime(t.createdAt)}
                      </td>
                      <td className="py-3 pl-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEdit(t)}
                            leftIcon={<Pencil className="h-3.5 w-3.5" />}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setMergeFrom(t);
                              setMergeOpen(true);
                            }}
                            className="text-info hover:text-info hover:bg-info/10"
                            leftIcon={<Merge className="h-3.5 w-3.5" />}
                          >
                            Merge
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteTag(t)}
                            className="text-danger hover:text-danger hover:bg-danger/10"
                            leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between mt-5 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Showing {current.length} of {filtered.length} tags
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={goPrev} disabled={prevCursors.length === 0} leftIcon={<ChevronLeft className="h-4 w-4" />}>Prev</Button>
              <Button variant="outline" size="sm" onClick={goNext} disabled={!hasMore} rightIcon={<ChevronRight className="h-4 w-4" />}>Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Modal
        open={editorOpen}
        onClose={() => !createMut.isPending && setEditorOpen(false)}
        title={editing ? "Edit tag" : "New tag"}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditorOpen(false)} disabled={createMut.isPending}>Cancel</Button>
            <Button variant="primary" loading={createMut.isPending} onClick={submitForm}>
              {editing ? "Save" : "Create tag"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Name"
            value={form.name}
            onChange={(e) => setForm((f: any) => ({ ...f, name: e.target.value }))}
            placeholder="ai-safety"
          />
          <Input
            label="Slug"
            value={form.slug}
            onChange={(e) =>
              setForm((f: any) => ({
                ...f,
                slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
              }))
            }
            placeholder="auto-generated from name"
          />
          <Select
            label="Category (optional)"
            value={form.categoryId ?? ""}
            onChange={(v) => setForm((f: any) => ({ ...f, categoryId: v || undefined }))}
            options={[
              { value: "", label: "No category" },
              ...(categories.data ?? []).map((c: any) => ({ value: c.id, label: c.name })),
            ]}
          />
        </div>
      </Modal>

      <Modal
        open={!!deleteTag}
        onClose={() => !deleteMut.isPending && setDeleteTag(null)}
        title={`Delete #${deleteTag?.name}?`}
        description="This tag will be removed from all posts. This action cannot be undone."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteTag(null)} disabled={deleteMut.isPending}>Cancel</Button>
            <Button variant="danger" loading={deleteMut.isPending} onClick={handleDelete} leftIcon={<Trash2 className="h-4 w-4" />}>
              Delete tag
            </Button>
          </>
        }
      >
        <div className="flex items-start gap-3 p-3 rounded-xl bg-danger/10 border border-danger/20">
          <AlertTriangle className="h-5 w-5 text-danger flex-shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            Tag will be removed from {formatNumber(deleteTag?.postCount ?? 0)} posts.
          </p>
        </div>
      </Modal>

      <Modal
        open={mergeOpen}
        onClose={() => !createMut.isPending && setMergeOpen(false)}
        title={`Merge #${mergeFrom?.name ?? ""}`}
        description="Move all posts with this tag into a different target tag."
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setMergeOpen(false)} disabled={createMut.isPending}>Cancel</Button>
            <Button variant="primary" loading={createMut.isPending} onClick={handleMerge} leftIcon={<Merge className="h-4 w-4" />}>
              Merge tags
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/40 border border-border">
            <Hash className="h-4 w-4 text-primary" />
            <span className="text-sm">Merge from: <span className="font-semibold">#{mergeFrom?.name}</span></span>
          </div>
          <Select
            label="Target tag (merge into)"
            value={mergeIntoId}
            onChange={setMergeIntoId}
            options={filtered
              .filter((t) => t.id !== mergeFrom?.id)
              .map((t) => ({ value: t.id, label: `#${t.name} (${formatNumber(t.postCount)} posts)` }))}
            placeholder="Choose destination tag..."
          />
          <p className="text-xs text-muted-foreground">
            After merging, the source tag will be deleted and all posts will be re-tagged.
          </p>
        </div>
      </Modal>
    </div>
  );
}
