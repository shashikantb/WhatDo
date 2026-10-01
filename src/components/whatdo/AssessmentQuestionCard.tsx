"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { PostType } from "@prisma/client";

export type AssessmentOptionT = {
  id: string;
  sortOrder: number;
  label: string;
  imageUrl?: string | null;
  signalHints?: any;
};
export type AssessmentQuestionT = {
  id: string;
  questionText: string;
  category: string;
  subcategory?: string | null;
  answerType: PostType;
  targetCity?: string | null;
  options: AssessmentOptionT[];
};

function RatingSlider({
  max,
  value,
  onChange,
}: {
  max: number;
  value: number | null;
  onChange: (n: number) => void;
}) {
  const [hover, setHover] = React.useState<number | null>(null);
  const active = hover ?? value ?? 0;
  return (
    <div className="flex flex-col items-center gap-3 pt-2">
      <div className="flex items-center gap-2">
        {Array.from({ length: max }).map((_, i) => {
          const n = i + 1;
          const filled = n <= active;
          return (
            <button
              key={n}
              type="button"
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(null)}
              onClick={() => onChange(n)}
              className={cn(
                "h-12 w-12 rounded-2xl text-[15px] font-black transition-all",
                filled
                  ? "bg-gradient-to-br from-fuchsia-500 to-indigo-500 text-white shadow-lg shadow-fuchsia-500/30 scale-105"
                  : "bg-white/10 border border-white/15 text-white/70 hover:bg-white/20",
              )}
            >
              {n}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-white/60 font-semibold">
        {value ? `You picked: ${value}` : hover ? `Hover: ${hover}` : "Tap 1–" + max}
      </p>
    </div>
  );
}

function PriceTiers({
  options,
  selected,
  onChange,
}: {
  options: AssessmentOptionT[];
  selected: string | number | null;
  onChange: (id: string, index: number) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
      {options.map((o, i) => {
        const picked = selected === o.id;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id, i)}
            className={cn(
              "flex items-center justify-between rounded-2xl border px-4 py-3 transition-all text-left",
              picked
                ? "bg-gradient-to-r from-emerald-500/25 to-emerald-400/10 border-emerald-400/40"
                : "bg-white/5 border-white/15 hover:bg-white/10",
            )}
          >
            <span className="font-bold text-[15px] text-white">{o.label}</span>
            <span
              className={cn(
                "h-5 w-5 rounded-full border-2 transition-colors",
                picked ? "border-emerald-300 bg-emerald-400" : "border-white/30",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}

export function AssessmentQuestionCard({
  question,
  selectedOptionId,
  onSelect,
  disabled,
}: {
  question: AssessmentQuestionT;
  selectedOptionId: string | null;
  onSelect: (optionId: string, optionIndex: number) => void;
  disabled?: boolean;
}) {
  const answerType = question.answerType;
  const opts = [...question.options].sort((a, b) => a.sortOrder - b.sortOrder);

  const ratingIdx = opts.findIndex((o) => o.id === selectedOptionId);
  const ratingValue = ratingIdx >= 0 ? ratingIdx + 1 : null;

  return (
    <article className="w-full max-w-lg mx-auto rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-fuchsia-950 border border-white/10 shadow-2xl shadow-black/40 p-5 sm:p-7">
      <div className="flex items-center justify-between mb-4">
        <span className="inline-flex items-center rounded-full bg-white/10 border border-white/15 px-3 py-1 text-[10.5px] font-bold uppercase tracking-wide text-white/85">
          {String(question.category).replaceAll("_", " ")}
        </span>
        {question.targetCity ? (
          <span className="text-[11px] font-semibold text-white/60 inline-flex items-center gap-1">
            Local · {question.targetCity}
          </span>
        ) : null}
      </div>

      <h2 className="text-xl sm:text-2xl font-black leading-snug tracking-tight text-white">
        {question.questionText}
      </h2>

      {question.subcategory ? (
        <p className="mt-2 text-xs text-white/60 font-semibold">
          {String(question.subcategory).replaceAll("_", " ")}
        </p>
      ) : null}

      <div className="mt-5">
        {(answerType === "YES_NO" || answerType === "POLL" || answerType === "PREDICTION") && (
          <div className="grid grid-cols-2 gap-3">
            {opts.map((o, i) => {
              const picked = selectedOptionId === o.id;
              return (
                <button
                  key={o.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => onSelect(o.id, i)}
                  className={cn(
                    "rounded-2xl py-4 text-[15px] font-black transition-all border",
                    picked
                      ? "bg-white text-black shadow-xl scale-[1.01]"
                      : "bg-white/10 border-white/15 text-white hover:bg-white/15 disabled:opacity-60",
                  )}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        )}

        {answerType === "A_VS_B" && opts.length >= 2 && (
          <div className="grid grid-cols-5 gap-3 items-stretch">
            <button
              type="button"
              disabled={disabled}
              onClick={() => onSelect(opts[0]!.id, 0)}
              className={cn(
                "col-span-2 rounded-2xl py-5 text-[14px] font-black border transition-all",
                selectedOptionId === opts[0]!.id
                  ? "bg-gradient-to-br from-fuchsia-500 to-pink-500 text-white shadow-xl scale-[1.01]"
                  : "bg-white/10 border-white/15 text-white hover:bg-white/15",
              )}
            >
              {opts[0]!.label}
            </button>
            <div className="col-span-1 flex items-center justify-center">
              <span className="text-[10.5px] font-black tracking-widest text-white/60 bg-white/10 rounded-full px-2.5 py-1 border border-white/15">
                VS
              </span>
            </div>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onSelect(opts[1]!.id, 1)}
              className={cn(
                "col-span-2 rounded-2xl py-5 text-[14px] font-black border transition-all",
                selectedOptionId === opts[1]!.id
                  ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-xl scale-[1.01]"
                  : "bg-white/10 border-white/15 text-white hover:bg-white/15",
              )}
            >
              {opts[1]!.label}
            </button>
          </div>
        )}

        {(answerType === "MULTIPLE_CHOICE" || answerType === "DECISION") && (
          <div className="grid grid-cols-1 gap-2.5">
            {opts.map((o, i) => {
              const picked = selectedOptionId === o.id;
              return (
                <button
                  key={o.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => onSelect(o.id, i)}
                  className={cn(
                    "flex items-center justify-between rounded-2xl border px-4 py-3.5 text-left transition-all",
                    picked
                      ? "bg-white text-black border-white shadow-xl"
                      : "bg-white/5 border-white/15 text-white hover:bg-white/10 disabled:opacity-60",
                  )}
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <span
                      className={cn(
                        "h-6 w-6 shrink-0 rounded-full border-2 flex items-center justify-center text-[11px] font-black",
                        picked
                          ? "border-black bg-black text-white"
                          : "border-white/30 text-white/70",
                      )}
                    >
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="font-bold text-[15px] truncate">
                      {o.label}
                    </span>
                  </span>
                  {picked && <span className="text-black font-black text-sm">✓</span>}
                </button>
              );
            })}
          </div>
        )}

        {answerType === "RATING" && (
          <RatingSlider
            max={Math.max(3, Math.min(10, opts.length))}
            value={ratingValue}
            onChange={(n) => {
              const idx = n - 1;
              const opt = opts[idx];
              if (opt) onSelect(opt.id, idx);
            }}
          />
        )}

        {answerType === "PRICE" && (
          <PriceTiers
            options={opts}
            selected={selectedOptionId}
            onChange={onSelect}
          />
        )}
      </div>
    </article>
  );
}

export function RareAnswerBanner({
  agreementPct,
  rarityPct,
  isRare,
  isVeryRare,
}: {
  agreementPct: number | null;
  rarityPct: number | null;
  isRare: boolean;
  isVeryRare: boolean;
}) {
  if (agreementPct == null) {
    return (
      <div className="max-w-lg mx-auto rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white/80">
        <span className="inline-flex items-center gap-2 font-semibold">
          <span className="h-2 w-2 rounded-full bg-white/40 animate-pulse" />
          Collecting more votes. Your personal percentages unlock when 30+
          people in WhatDo have answered.
        </span>
      </div>
    );
  }
  const badge = isVeryRare
    ? { label: "VERY RARE TAKE", cls: "bg-gradient-to-r from-fuchsia-500 to-red-500", emoji: "🏆" }
    : isRare
      ? { label: "RARE TAKE", cls: "bg-gradient-to-r from-amber-500 to-orange-500", emoji: "💎" }
      : { label: "MAJORITY PICK", cls: "bg-gradient-to-r from-emerald-500 to-teal-500", emoji: "✓" };

  return (
    <div className="max-w-lg mx-auto rounded-2xl bg-white/5 border border-white/10 px-4 py-4 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10.5px] font-black tracking-wide text-white shadow-lg ${badge.cls}`}
        >
          <span>{badge.emoji}</span> {badge.label}
        </span>
        <span className="text-[11.5px] font-bold text-white/75">
          {agreementPct.toFixed(0)}% agree with you
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-amber-300"
          style={{ width: `${Math.max(2, Math.min(100, agreementPct))}%` }}
        />
      </div>
      {rarityPct != null && (isRare || isVeryRare) && (
        <p className="text-[12px] font-semibold text-white/75">
          Only <span className="font-black text-white">{rarityPct.toFixed(0)}%</span>{" "}
          of people chose what you chose.
        </p>
      )}
    </div>
  );
}
