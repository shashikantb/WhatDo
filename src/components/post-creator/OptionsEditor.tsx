"use client";

import * as React from "react";
import { Plus, X, GripVertical, ImageIcon, Upload, Calendar, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/design-system/Input";
import { Button } from "@/components/design-system/Button";
import type { OpinionTypeValue } from "./OpinionTypePicker";
import { Badge } from "@/components/design-system/Badge";

export interface PostOptionInput {
  label: string;
  value: string;
  imageUrl?: string;
  sortOrder: number;
}

export interface OptionsEditorProps {
  opinionType: OpinionTypeValue;
  options: PostOptionInput[];
  onChange: (options: PostOptionInput[]) => void;
  onExpiresAtChange?: (expiresAt: Date | undefined) => void;
  expiresAt?: Date;
}

const DEFAULT_EMOJIS = ["❤️", "😂", "😐", "🤔", "😡", "🤩", "🎉", "🤮", "🔥", "💯"];
const POLL_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f43f5e",
];

interface AVSBOptionDropzoneProps {
  idx: 0 | 1;
  imageUrl: string | undefined;
  onImageChange: (imageUrl: string) => void;
}

const AVSBOptionDropzone: React.FC<AVSBOptionDropzoneProps> = ({
  idx,
  imageUrl,
  onImageChange,
}) => {
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [drag, setDrag] = React.useState(false);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      onImageChange(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />
      <div
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          "aspect-video rounded-xl border-2 border-dashed flex items-center justify-center cursor-pointer transition-all overflow-hidden bg-muted",
          drag
            ? "border-primary bg-primary/5"
            : imageUrl
              ? "border-transparent"
              : "border-border hover:border-primary/50"
        )}
      >
        {imageUrl ? (
          <div className="relative w-full h-full">
            <img
              src={imageUrl}
              alt={`Option ${idx === 0 ? "A" : "B"}`}
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onImageChange("");
              }}
              className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5 text-muted-foreground p-3">
            <Upload className="h-6 w-6" strokeWidth={1.5} />
            <span className="text-xs font-medium text-center">
              Drop image or click
              <br />
              <span className="opacity-60">Option {idx === 0 ? "A" : "B"}</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export const OptionsEditor: React.FC<OptionsEditorProps> = ({
  opinionType,
  options,
  onChange,
  onExpiresAtChange,
  expiresAt,
}) => {
  const updateOption = (index: number, field: keyof PostOptionInput, value: string) => {
    const updated = [...options];
    updated[index] = { ...updated[index], [field]: value, sortOrder: updated[index].sortOrder ?? index };
    onChange(updated);
  };

  const reorder = (from: number, to: number) => {
    if (to < 0 || to >= options.length) return;
    const next = [...options];
    [next[from], next[to]] = [next[to], next[from]];
    onChange(next.map((o, i) => ({ ...o, sortOrder: i })));
  };

  const addOption = () => {
    const max = getMaxOptions();
    if (options.length >= max) return;
    const newIdx = options.length;
    onChange([
      ...options,
      {
        label: `Option ${newIdx + 1}`,
        value: `opt_${Date.now()}_${newIdx}`,
        sortOrder: newIdx,
      },
    ]);
  };

  const removeOption = (index: number) => {
    const min = getMinOptions();
    if (options.length <= min) return;
    const filtered = options.filter((_, i) => i !== index);
    onChange(filtered.map((o, i) => ({ ...o, sortOrder: i })));
  };

  const getMinOptions = (): number => {
    switch (opinionType) {
      case "DECISION":
        return 3;
      case "PRICE":
        return 2;
      case "EMOJI":
        return 2;
      case "YES_NO":
      case "A_VS_B":
      case "PREDICTION":
      case "RATING":
        return opinionType === "RATING" ? 10 : 2;
      case "MULTIPLE_CHOICE":
      case "POLL":
      default:
        return 2;
    }
  };

  const getMaxOptions = (): number => {
    switch (opinionType) {
      case "YES_NO":
      case "A_VS_B":
      case "PREDICTION":
        return 2;
      case "DECISION":
        return 3;
      case "RATING":
        return 10;
      case "EMOJI":
        return 8;
      case "PRICE":
        return 6;
      case "MULTIPLE_CHOICE":
      case "POLL":
      default:
        return 10;
    }
  };

  const actualMax = getMaxOptions();
  const actualMin = getMinOptions();
  const canAdd = options.length < actualMax;
  const canRemove = options.length > actualMin;

  return (
    <div className="space-y-4 w-full">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          {opinionType === "YES_NO" && "Yes / No Options"}
          {opinionType === "DECISION" && "Decision Options"}
          {opinionType === "PREDICTION" && "Prediction Options"}
          {opinionType === "MULTIPLE_CHOICE" && "Multiple Choice Options"}
          {opinionType === "POLL" && "Poll Options"}
          {opinionType === "A_VS_B" && "A vs B Options"}
          {opinionType === "RATING" && "Rating Scale (1–10)"}
          {opinionType === "EMOJI" && "Emoji Reactions"}
          {opinionType === "PRICE" && "Price Tiers"}
        </h3>
        <span className="text-xs text-muted-foreground">
          {options.length} / {actualMax}
        </span>
      </div>

      {(opinionType === "YES_NO" || opinionType === "PREDICTION") && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { idx: 0, label: "YES", badge: "YES", variant: "success" as const },
            { idx: 1, label: "NO", badge: "NO", variant: "danger" as const },
          ].map((row) => (
            <div
              key={row.idx}
              className={cn(
                "rounded-xl border p-4 flex items-center gap-3",
                row.variant === "success"
                  ? "border-success/30 bg-success/5"
                  : "border-danger/30 bg-danger/5"
              )}
            >
              <Badge variant={row.variant} size="md" className="flex-shrink-0">
                {row.badge}
              </Badge>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">
                  {options[row.idx]?.label ?? row.label}
                </p>
                <p className="text-xs text-muted-foreground">
                  Fixed option — cannot be edited
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {opinionType === "DECISION" && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { idx: 0, label: "DO IT", variant: "success" as const },
            { idx: 1, label: "DON'T DO IT", variant: "danger" as const },
            { idx: 2, label: "NOT SURE", variant: "default" as const },
          ].map((row) => (
            <div
              key={row.idx}
              className={cn(
                "rounded-xl border p-4 flex items-center justify-center",
                row.variant === "success" && "border-success/30 bg-success/5",
                row.variant === "danger" && "border-danger/30 bg-danger/5",
                row.variant === "default" && "border-border bg-muted/50"
              )}
            >
              <div className="text-center">
                <p className="text-base font-black tracking-tight text-foreground">
                  {options[row.idx]?.label ?? row.label}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {opinionType === "PREDICTION" && (
        <div className="rounded-xl border border-border p-4 bg-card space-y-3">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Prediction Closing Time
          </h4>
          <Input
            type="datetime-local"
            label="Voting closes at"
            helperText="The prediction will lock at this time. Results are resolved manually afterwards."
            value={
              expiresAt
                ? new Date(
                    expiresAt.getTime() - expiresAt.getTimezoneOffset() * 60000
                  )
                    .toISOString()
                    .slice(0, 16)
                : ""
            }
            onChange={(e) => {
              onExpiresAtChange?.(
                e.target.value ? new Date(e.target.value) : undefined
              );
            }}
          />
        </div>
      )}

      {opinionType === "A_VS_B" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[0, 1].map((idx) => (
            <div
              key={idx}
              className="space-y-3 rounded-xl border border-border p-3 bg-card"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Option {idx === 0 ? "A" : "B"}
                </p>
                <Badge
                  size="sm"
                  variant={idx === 0 ? "info" : "warning"}
                  className="font-black"
                >
                  {idx === 0 ? "A" : "B"}
                </Badge>
              </div>
              <AVSBOptionDropzone
                idx={idx as 0 | 1}
                imageUrl={options[idx]?.imageUrl}
                onImageChange={(url) => updateOption(idx, "imageUrl", url)}
              />
              <Input
                placeholder={`Option ${idx === 0 ? "A" : "B"} title`}
                value={options[idx]?.label ?? ""}
                onChange={(e) => updateOption(idx, "label", e.target.value)}
                maxLength={60}
              />
            </div>
          ))}
        </div>
      )}

      {opinionType === "RATING" && (
        <div className="space-y-3">
          <div className="rounded-xl border border-border p-4 bg-card">
            <p className="text-xs text-muted-foreground mb-3">
              Locked scale from 1 to 10. Users will rate by selecting a number.
            </p>
            <div className="grid grid-cols-10 gap-1.5">
              {Array.from({ length: 10 }).map((_, i) => {
                const num = i + 1;
                return (
                  <div
                    key={num}
                    className="aspect-square rounded-lg border border-border bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center text-sm font-black text-foreground"
                  >
                    {num}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {opinionType === "EMOJI" && (
        <div className="space-y-4">
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-8 gap-2">
            {options.map((opt, idx) => (
              <div
                key={idx}
                className="group relative"
              >
                <div className="relative aspect-square rounded-xl border-2 border-border bg-card flex flex-col items-center justify-center transition-colors hover:border-primary/30">
                  <span className="text-2xl md:text-3xl leading-none select-none">
                    {opt.label}
                  </span>
                  {canRemove && (
                    <button
                      type="button"
                      onClick={() => removeOption(idx)}
                      className="absolute -top-1.5 -right-1.5 h-6 w-6 rounded-full bg-danger text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                      aria-label="Remove emoji"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <div className="flex items-center justify-center gap-0.5 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => reorder(idx, idx - 1)}
                    disabled={idx === 0}
                    className="h-5 w-5 rounded text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 flex items-center justify-center"
                  >
                    <ArrowUp className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => reorder(idx, idx + 1)}
                    disabled={idx === options.length - 1}
                    className="h-5 w-5 rounded text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 flex items-center justify-center"
                  >
                    <ArrowDown className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
            {canAdd && (
              <button
                type="button"
                onClick={() => {
                  const newEmojis = DEFAULT_EMOJIS.filter(
                    (e) => !options.some((o) => o.label === e)
                  );
                  const next = newEmojis[0] ?? "✨";
                  onChange([
                    ...options,
                    {
                      label: next,
                      value: `emoji_${Date.now()}`,
                      sortOrder: options.length,
                    },
                  ]);
                }}
                className="aspect-square rounded-xl border-2 border-dashed border-border bg-muted/30 flex items-center justify-center text-muted-foreground hover:border-primary hover:bg-primary/5 hover:text-primary transition-colors"
              >
                <Plus className="h-5 w-5" />
              </button>
            )}
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Quick pick from defaults
            </p>
            <div className="flex flex-wrap gap-1.5">
              {DEFAULT_EMOJIS.map((emoji) => {
                const used = options.some((o) => o.label === emoji);
                return (
                  <button
                    key={emoji}
                    type="button"
                    disabled={used || !canAdd}
                    onClick={() => {
                      if (used || !canAdd) return;
                      onChange([
                        ...options,
                        {
                          label: emoji,
                          value: `emoji_${Date.now()}_${emoji}`,
                          sortOrder: options.length,
                        },
                      ]);
                    }}
                    className={cn(
                      "h-10 w-10 text-xl rounded-lg border transition-all",
                      used
                        ? "border-primary bg-primary/10 opacity-50 cursor-not-allowed"
                        : canAdd
                          ? "border-border bg-card hover:border-primary hover:bg-primary/5 active:scale-95"
                          : "opacity-40 cursor-not-allowed border-border bg-card"
                    )}
                  >
                    {emoji}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Custom emoji
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="Paste any emoji..."
                maxLength={4}
                onKeyDown={(e) => {
                  const val = (e.target as HTMLInputElement).value.trim();
                  if (e.key === "Enter" && val && canAdd) {
                    e.preventDefault();
                    onChange([
                      ...options,
                      {
                        label: val,
                        value: `custom_emoji_${Date.now()}`,
                        sortOrder: options.length,
                      },
                    ]);
                    (e.target as HTMLInputElement).value = "";
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const input = document.querySelector<HTMLInputElement>(
                    'input[placeholder="Paste any emoji..."]'
                  );
                  const val = input?.value.trim();
                  if (val && canAdd) {
                    onChange([
                      ...options,
                      {
                        label: val,
                        value: `custom_emoji_${Date.now()}`,
                        sortOrder: options.length,
                      },
                    ]);
                    if (input) input.value = "";
                  }
                }}
                disabled={!canAdd}
              >
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </div>
          </div>
        </div>
      )}

      {opinionType === "PRICE" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {options.map((opt, idx) => (
            <div
              key={idx}
              className="group relative rounded-xl border border-border bg-card p-3 transition-all hover:border-primary/30"
            >
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground opacity-40 flex-shrink-0" />
                <div className="flex-1">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">
                      ₹
                    </span>
                    <input
                      type="text"
                      value={opt.label}
                      onChange={(e) => {
                        const v = e.target.value;
                        const updated = [...options];
                        updated[idx] = {
                          ...updated[idx],
                          label: v,
                          value: v.replace(/[^0-9+]/g, "") || String(idx),
                        };
                        onChange(updated);
                      }}
                      maxLength={30}
                      placeholder="e.g. 499, 2999+"
                      className="w-full h-10 rounded-lg border border-border bg-background pl-8 pr-3 text-sm text-foreground placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-0.5">
                  <button
                    type="button"
                    onClick={() => reorder(idx, idx - 1)}
                    disabled={idx === 0}
                    className="h-6 w-6 rounded text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 flex items-center justify-center"
                  >
                    <ArrowUp className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => reorder(idx, idx + 1)}
                    disabled={idx === options.length - 1}
                    className="h-6 w-6 rounded text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 flex items-center justify-center"
                  >
                    <ArrowDown className="h-3 w-3" />
                  </button>
                </div>
                {canRemove && (
                  <button
                    type="button"
                    onClick={() => removeOption(idx)}
                    className="absolute -top-1.5 -right-1.5 h-6 w-6 rounded-full bg-danger text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                    aria-label="Remove tier"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
          {canAdd && (
            <button
              type="button"
              onClick={addOption}
              className="rounded-xl border-2 border-dashed border-border bg-muted/30 p-3 flex items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:bg-primary/5 hover:text-primary transition-colors min-h-[58px]"
            >
              <Plus className="h-4 w-4" />
              <span className="text-sm font-medium">Add price tier</span>
            </button>
          )}
        </div>
      )}

      {(opinionType === "MULTIPLE_CHOICE" || opinionType === "POLL") && (
        <div className="space-y-2">
          {options.map((opt, idx) => (
            <div
              key={idx}
              className="group flex items-center gap-2 rounded-xl border border-border bg-card p-2 transition-all hover:border-primary/30"
            >
              <div className="flex-shrink-0 p-2 text-muted-foreground opacity-40 cursor-grab">
                <GripVertical className="h-4 w-4" />
              </div>
              {opinionType === "POLL" && (
                <div className="flex-shrink-0">
                  <label className="relative block h-8 w-8 rounded-full overflow-hidden cursor-pointer border border-border shadow-sm">
                    <div
                      className="absolute inset-0"
                      style={{
                        backgroundColor:
                          POLL_COLORS[idx % POLL_COLORS.length],
                      }}
                    />
                    <input
                      type="color"
                      className="absolute inset-0 opacity-0 cursor-pointer h-full w-full"
                      value={POLL_COLORS[idx % POLL_COLORS.length]}
                      onChange={(e) => {
                        POLL_COLORS[idx % POLL_COLORS.length] = e.target.value;
                      }}
                      aria-label="Option color"
                    />
                  </label>
                </div>
              )}
              <div className="flex-shrink-0 h-7 w-7 rounded-md bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground">
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  value={opt.label}
                  onChange={(e) => updateOption(idx, "label", e.target.value)}
                  maxLength={60}
                  placeholder={`Option ${idx + 1}`}
                  className="w-full bg-transparent text-sm text-foreground placeholder:text-slate-400 focus:outline-none"
                />
              </div>
              <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => reorder(idx, idx - 1)}
                  disabled={idx === 0}
                  className="h-6 w-6 rounded text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 flex items-center justify-center"
                >
                  <ArrowUp className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => reorder(idx, idx + 1)}
                  disabled={idx === options.length - 1}
                  className="h-6 w-6 rounded text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 flex items-center justify-center"
                >
                  <ArrowDown className="h-3 w-3" />
                </button>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeOption(idx)}
                disabled={!canRemove}
                className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                aria-label={`Remove option ${idx + 1}`}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {canAdd && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addOption}
              className="w-full"
              leftIcon={<Plus className="h-4 w-4" />}
            >
              Add Option
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
