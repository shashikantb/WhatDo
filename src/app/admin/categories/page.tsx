"use client";

import * as React from "react";
import {
  FolderTree,
  Pencil,
  Trash2,
  Plus,
  AlertTriangle,
  Palette,
  X,
  Check,
  ToggleLeft,
  ToggleRight,
  Cpu,
  Film,
  Trophy,
  Newspaper,
  Gamepad2,
  UtensilsCrossed,
  Plane,
  Dumbbell,
  GraduationCap,
  DollarSign,
  FlaskConical,
  Heart,
  Shirt,
  Briefcase,
  Car,
  BookOpen,
  Music,
  Camera,
  Home,
  Sprout,
  Sparkles,
  Baby,
  Landmark,
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

const ICON_OPTIONS = [
  { value: "Cpu", label: "Cpu", component: Cpu },
  { value: "Film", label: "Film", component: Film },
  { value: "Trophy", label: "Trophy", component: Trophy },
  { value: "Newspaper", label: "Newspaper", component: Newspaper },
  { value: "Gamepad2", label: "Gamepad2", component: Gamepad2 },
  { value: "UtensilsCrossed", label: "Utensils", component: UtensilsCrossed },
  { value: "Plane", label: "Plane", component: Plane },
  { value: "Dumbbell", label: "Dumbbell", component: Dumbbell },
  { value: "GraduationCap", label: "Graduation", component: GraduationCap },
  { value: "DollarSign", label: "Dollar", component: DollarSign },
  { value: "Palette", label: "Palette", component: Palette },
  { value: "FlaskConical", label: "Science", component: FlaskConical },
  { value: "Heart", label: "Health", component: Heart },
  { value: "Shirt", label: "Fashion", component: Shirt },
  { value: "Briefcase", label: "Business", component: Briefcase },
  { value: "Car", label: "Auto", component: Car },
  { value: "BookOpen", label: "Books", component: BookOpen },
  { value: "Music", label: "Music", component: Music },
  { value: "Camera", label: "Photography", component: Camera },
  { value: "Home", label: "Home", component: Home },
  { value: "Sprout", label: "Nature", component: Sprout },
  { value: "Sparkles", label: "Beauty", component: Sparkles },
  { value: "Baby", label: "Family", component: Baby },
  { value: "Landmark", label: "Travel", component: Landmark },
];

const COLOR_PRESETS = [
  "#ef4444", "#f97316", "#eab308", "#84cc16", "#22c55e",
  "#14b8a6", "#06b6d4", "#0ea5e9", "#6366f1", "#8b5cf6",
  "#a855f7", "#d946ef", "#ec4899", "#f43f5e", "#64748b",
];

const EMPTY_CAT = {
  id: "",
  name: "",
  slug: "",
  icon: "Cpu",
  color: "#6366f1",
  description: "",
  sortOrder: 0,
  isActive: true,
};

function IconRenderer(iconName: string, className = "h-5 w-5") {
  const def = ICON_OPTIONS.find((i) => i.value === iconName);
  if (!def) return <FolderTree className={className} />;
  const C: any = def.component;
  return <C className={className} />;
}

export default function AdminCategoriesPage() {
  const { show } = useToast();
  const utils = trpc.useUtils();

  const [editorOpen, setEditorOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<any>(null);
  const [form, setForm] = React.useState<any>({ ...EMPTY_CAT });
  const [deleteCat, setDeleteCat] = React.useState<any>(null);

  const list = trpc.categories.listAll.useQuery();

  const createMut = trpc.categories.create.useMutation({
    onSuccess: () => {
      void utils.categories.listAll.invalidate();
      show("Category created", "success");
      setEditorOpen(false);
      setEditing(null);
    },
    onError: (err) => show(`Failed: ${err.message}`, "danger"),
  });
  const updateMut = trpc.categories.update.useMutation({
    onSuccess: () => {
      void utils.categories.listAll.invalidate();
      show("Category updated", "success");
      setEditorOpen(false);
      setEditing(null);
    },
    onError: (err) => show(`Failed: ${err.message}`, "danger"),
  });
  const deleteMut = trpc.categories.delete.useMutation({
    onSuccess: () => {
      void utils.categories.listAll.invalidate();
      show("Category deleted", "success");
      setDeleteCat(null);
    },
    onError: (err) => show(`Failed: ${err.message}`, "danger"),
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_CAT });
    setEditorOpen(true);
  };
  const openEdit = (c: any) => {
    setEditing(c);
    setForm({
      id: c.id, name: c.name, slug: c.slug, icon: c.icon ?? "Cpu", color: c.color ?? "#6366f1", description: c.description ?? "", sortOrder: c.sortOrder ?? 0, isActive: c.isActive !== false });
    setEditorOpen(true);
  };
  const submitForm = () => {
    if (!form.name || !form.slug) {
      show("Name and slug are required", "warning");
      return;
    }
    if (editing) {
        updateMut.mutate({
          id: editing.id,
          name: form.name,
          slug: form.slug,
          icon: form.icon,
          color: form.color,
          description: form.description || undefined,
          sortOrder: Number(form.sortOrder ?? 0),
          isActive: !!form.isActive,
        } as any);
    } else {
      createMut.mutate({
        name: form.name,
        slug: form.slug,
        icon: form.icon,
        color: form.color,
        description: form.description || undefined,
        sortOrder: Number(form.sortOrder ?? 0),
      });
    }
  };

  const handleDelete = () => {
    if (!deleteCat) return;
    deleteMut.mutate({ id: deleteCat.id });
  };

  const data: any[] = list.data ?? [];
  const cats = data.length > 0 ? data : Array.from({ length: 12 }).map((_, i) => ({
    id: `seed_${i}`,
    name: [
      "Technology", "Entertainment", "Sports", "News & Politics", "Gaming",
      "Food & Cooking", "Travel", "Fitness & Health", "Education", "Finance",
      "Art & Design", "Science",
    ][i],
    slug: ["tech", "ent", "sports", "news", "gaming", "food", "travel", "fit", "edu", "fin", "art", "sci"][i],
    icon: ICON_OPTIONS[i]?.value ?? "Cpu",
    color: COLOR_PRESETS[i % COLOR_PRESETS.length],
    postCount: Math.floor(Math.random() * 2000),
    isActive: true,
    description: "Category description",
  }));

  const pending = createMut.isPending || updateMut.isPending;

  return (
    <div className="space-y-5 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-primary/15 border border-primary/20 flex items-center justify-center">
            <FolderTree className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Categories</h1>
            <p className="text-sm text-muted-foreground">
              {cats.length} categories · organize post taxonomy
            </p>
          </div>
        </div>
        <Button onClick={openCreate} leftIcon={<Plus className="h-4 w-4" />}>
          New category
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {cats.map((c) => (
          <Card key={c.id} className="group overflow-hidden">
            <CardContent className="p-0">
              <div
                className="p-5" style={{ background: `${c.color ?? "#6366f1"}12` }}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-11 w-11 rounded-xl border flex items-center justify-center"
                      style={{
                        background: `${c.color ?? "#6366f1"}20`,
                        borderColor: `${c.color ?? "#6366f1"}40`,
                        color: c.color ?? "#6366f1",
                      }}
                    >
                      {IconRenderer(c.icon ?? "Cpu", "h-5 w-5")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold leading-tight truncate pr-2">
                        {c.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">/{c.slug}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!c.isActive && <Badge variant="default" size="sm">Inactive</Badge>}
                    <button
                      type="button"
                      onClick={() => openEdit(c)}
                      className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-background hover:text-foreground transition-colors"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
              <div className="px-5 py-4 border-t border-border/60 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider text-[10px] font-semibold">Posts</p>
                  <p className="text-lg font-bold tabular-nums">{formatNumber(c._count?.posts ?? c.postCount ?? 0)}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteCat(c)}
                  className="text-danger hover:text-danger hover:bg-danger/10"
                  leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                >
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Modal
        open={editorOpen}
        onClose={() => !pending && setEditorOpen(false)}
        title={editing ? "Edit category" : "New category"}
        description={editing ? "Update taxonomy metadata and appearance." : "Create a new content category"}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditorOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button variant="primary" loading={pending} onClick={submitForm}>
              {editing ? "Save changes" : "Create category"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Name"
              value={form.name}
              onChange={(e) =>
                setForm((f: any) => ({ ...f, name: e.target.value }))
              }
              placeholder="Technology"
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
              placeholder="technology"
              helperText="URL-friendly, lowercase letters, numbers, hyphens"
            />
          </div>
          <div>
            <p className="text-sm font-medium mb-2">Icon</p>
            <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-1.5">
              {ICON_OPTIONS.map((opt) => {
                const Icon: any = opt.component;
                const active = form.icon === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm((f: any) => ({ ...f, icon: opt.value }))}
                    className={`h-10 w-10 rounded-lg border flex items-center justify-center transition-all ${
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-primary/30 text-muted-foreground hover:text-foreground"
                    }`}
                    title={opt.label}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium mb-2">Color</p>
            <div className="flex flex-wrap items-center gap-2">
              {COLOR_PRESETS.map((color) => {
                const active = form.color === color;
                return (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setForm((f: any) => ({ ...f, color }))}
                    className={`h-8 w-8 rounded-full border-2 transition-all ${
                      active ? "border-foreground scale-110" : "border-transparent"
                    }`}
                    style={{ background: color }}
                  />
                );
              })}
              <div className="w-[1px] h-6 bg-border mx-1" />
              <Input
                value={form.color}
                onChange={(e) =>
                  setForm((f: any) => ({ ...f, color: e.target.value }))
                }
                className="!w-32"
                placeholder="#ff0000"
              />
            </div>
          </div>
          <Textarea
            label="Description (optional)"
            value={form.description}
            onChange={(e) =>
              setForm((f: any) => ({ ...f, description: e.target.value }))
            }
            rows={3}
            placeholder="What types of content belong here?"
            helperText={`${(form.description ?? "").length}/500`}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Sort order"
              type="number"
              value={form.sortOrder}
              onChange={(e) =>
                setForm((f: any) => ({
                  ...f,
                  sortOrder: Number(e.target.value) || 0,
                }))
              }
            />
            <div>
              <p className="text-sm font-medium mb-2">Status</p>
              <button
                type="button"
                onClick={() =>
                  setForm((f: any) => ({ ...f, isActive: !f.isActive }))
                }
                className="h-10 px-3 rounded-lg border border-border w-full flex items-center justify-between hover:bg-muted/50 transition-colors"
              >
                <span className="text-sm">
                  {form.isActive ? "Active" : "Inactive"}
                </span>
                {form.isActive ? (
                  <ToggleRight className="h-5 w-5 text-primary" />
                ) : (
                  <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                )}
              </button>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!deleteCat}
        onClose={() => !deleteMut.isPending && setDeleteCat(null)}
        title={`Delete "${deleteCat?.name}"?`}
        description="This category will be removed permanently. Posts in this category will become uncategorized."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteCat(null)} disabled={deleteMut.isPending}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={deleteMut.isPending}
              onClick={handleDelete}
              leftIcon={<Trash2 className="h-4 w-4" />}
            >
              Delete category
            </Button>
          </>
        }
      >
        <div className="flex items-start gap-3 p-3 rounded-xl bg-danger/10 border border-danger/20">
          <AlertTriangle className="h-5 w-5 text-danger flex-shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-semibold text-foreground">
              Posts in this category will become uncategorized
            </p>
            <p className="text-muted-foreground mt-0.5">
              They won&apos;t be deleted, just unlinked from this category.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
