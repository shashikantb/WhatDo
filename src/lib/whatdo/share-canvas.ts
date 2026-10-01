"use client";

import * as React from "react";
import type { WhatDoCardTemplate } from "@/lib/whatdo/ai-prompt";
import type { WhatDoArchetype } from "@/lib/whatdo/archetypes";
import { ARCHETYPE_DEFINITIONS } from "@/lib/whatdo/archetypes";
import type { SignalScores } from "@/lib/whatdo/signals";
import { WHATDO_SIGNALS, SIGNAL_META } from "@/lib/whatdo/signals";
import { getArchetypeDefinition } from "@/lib/whatdo/archetypes";

export const CARD_W = 1080;
export const CARD_H = 1920;

type ResultSnapshot = {
  displayName: string | null;
  username: string | null;
  archetype: WhatDoArchetype;
  agreementPct: number | null;
  rarityPct: number | null;
  strongestTrait: string;
  signalScores: SignalScores;
  citySnapshot: string | null;
  cityAlignmentPct: number | null;
  veryRareAnswersCount: number;
  rareAnswersCount: number;
  totalQuestions: number;
  shareToken: string | null;
  identityId: string;
};

function loadGoogleFont(ctx: CanvasRenderingContext2D) {
  try {
    (document as any).fonts?.load("bold 80px 'Space Grotesk', system-ui").catch(() => {});
  } catch {
  }
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines = 3,
): string[] {
  const words = String(text).split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    const test = current ? current + " " + w : w;
    if (ctx.measureText(test).width > maxWidth && current.length > 0) {
      lines.push(current);
      current = w;
      if (lines.length >= maxLines - 1) {
        break;
      }
    } else {
      current = test;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  return lines;
}

function bgTemplate(
  ctx: CanvasRenderingContext2D,
  template: WhatDoCardTemplate,
  opts: ResultSnapshot,
) {
  const w = CARD_W;
  const h = CARD_H;
  ctx.save();
  switch (template) {
    case "MINIMAL": {
      ctx.fillStyle = "#f7f5f0";
      ctx.fillRect(0, 0, w, h);
      const grad = ctx.createRadialGradient(w * 0.85, 180, 50, w * 0.85, 180, 900);
      grad.addColorStop(0, "rgba(217, 119, 6, 0.08)");
      grad.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      break;
    }
    case "NEON_GENZ": {
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, "#0b0014");
      grad.addColorStop(0.45, "#581c87");
      grad.addColorStop(1, "#16a34a");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 0.25;
      for (let i = 0; i < 300; i++) {
        ctx.fillStyle = i % 2 ? "#ec4899" : "#22d3ee";
        ctx.fillRect(Math.random() * w, Math.random() * h, 6, 6);
      }
      ctx.globalAlpha = 1;
      break;
    }
    case "PREMIUM_DARK": {
      ctx.fillStyle = "#070707";
      ctx.fillRect(0, 0, w, h);
      const gold = ctx.createLinearGradient(0, 0, w, h);
      gold.addColorStop(0, "#b45309");
      gold.addColorStop(0.5, "#fde68a");
      gold.addColorStop(1, "#78350f");
      ctx.strokeStyle = gold;
      ctx.lineWidth = 8;
      ctx.strokeRect(80, 80, w - 160, h - 160);
      ctx.globalAlpha = 0.08;
      ctx.fillStyle = "#fffbeb";
      for (let i = 0; i < 20; i++) {
        ctx.fillRect(80, 160 + i * 4, w - 160, 1);
      }
      ctx.globalAlpha = 1;
      break;
    }
    case "COLORFUL": {
      const blocks = [
        { x: 0, y: 0, w: w, h: h * 0.3, c: "#fbcfe8" },
        { x: 0, y: h * 0.3, w: w * 0.5, h: h * 0.25, c: "#bae6fd" },
        { x: w * 0.5, y: h * 0.3, w: w * 0.5, h: h * 0.25, c: "#fde68a" },
        { x: 0, y: h * 0.55, w: w, h: h * 0.45, c: "#d9f99d" },
      ];
      for (const b of blocks) {
        ctx.fillStyle = b.c;
        ctx.fillRect(b.x, b.y, b.w, b.h);
      }
      break;
    }
    case "FUTURISTIC_AI": {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#030712");
      g.addColorStop(0.5, "#1e1b4b");
      g.addColorStop(1, "#042f2e");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = "rgba(125,211,252,0.3)";
      ctx.lineWidth = 2;
      for (let y = 0; y < h; y += 80) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      for (let x = 0; x < w; x += 80) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      const iris = ctx.createRadialGradient(w / 2, h * 0.28, 40, w / 2, h * 0.28, 700);
      iris.addColorStop(0, "rgba(244,114,182,0.35)");
      iris.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = iris;
      ctx.fillRect(0, 0, w, h);
      break;
    }
    case "LOCAL_CITY": {
      const sun = ctx.createLinearGradient(0, 0, 0, h);
      sun.addColorStop(0, "#fb923c");
      sun.addColorStop(0.35, "#f43f5e");
      sun.addColorStop(0.65, "#7c3aed");
      sun.addColorStop(1, "#0f172a");
      ctx.fillStyle = sun;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "rgba(254,240,138,0.95)";
      ctx.beginPath();
      ctx.arc(w * 0.72, h * 0.22, 220, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#020617";
      const baseline = h * 0.7;
      const skyline = [
        260, 420, 300, 560, 390, 480, 320, 620, 430, 520, 300, 460, 380, 580, 340, 420,
      ];
      const segW = w / skyline.length;
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let i = 0; i < skyline.length; i++) {
        const height = skyline[i] ?? 400;
        ctx.lineTo(i * segW, baseline - height);
        ctx.lineTo((i + 1) * segW, baseline - height);
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();
      break;
    }
  }
  ctx.restore();
}

function textColors(template: WhatDoCardTemplate) {
  switch (template) {
    case "MINIMAL":
      return {
        primary: "#0f172a",
        secondary: "#475569",
        accent: "#9a3412",
        brand: "#1e293b",
        pill: "#1e293b",
        pillText: "#fff",
      };
    case "NEON_GENZ":
      return {
        primary: "#fef9c3",
        secondary: "#f0abfc",
        accent: "#34d399",
        brand: "#fff",
        pill: "#fff",
        pillText: "#581c87",
      };
    case "PREMIUM_DARK":
      return {
        primary: "#fde68a",
        secondary: "#fbbf24",
        accent: "#fef3c7",
        brand: "#fff",
        pill: "#fde68a",
        pillText: "#1c1917",
      };
    case "COLORFUL":
      return {
        primary: "#0f172a",
        secondary: "#334155",
        accent: "#be185d",
        brand: "#0f172a",
        pill: "#0f172a",
        pillText: "#fff",
      };
    case "FUTURISTIC_AI":
      return {
        primary: "#f8fafc",
        secondary: "#7dd3fc",
        accent: "#f472b6",
        brand: "#fff",
        pill: "#7dd3fc",
        pillText: "#082f49",
      };
    case "LOCAL_CITY":
      return {
        primary: "#fff7ed",
        secondary: "#fde68a",
        accent: "#fecaca",
        brand: "#fff",
        pill: "#fff7ed",
        pillText: "#7c2d12",
      };
  }
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawShareCard(
  ctx: CanvasRenderingContext2D,
  template: WhatDoCardTemplate,
  opts: ResultSnapshot,
) {
  loadGoogleFont(ctx);
  const w = CARD_W;
  const h = CARD_H;
  const col = textColors(template);
  bgTemplate(ctx, template, opts);
  const arch = getArchetypeDefinition(opts.archetype);
  const label = arch?.label ?? String(opts.archetype).replaceAll("_", " ");
  const tagline = arch?.tagline ?? "";
  const emoji = arch?.emoji ?? "✨";

  // Brand corner
  ctx.save();
  ctx.font = "900 40px 'Space Grotesk', system-ui, sans-serif";
  ctx.fillStyle = col.brand;
  ctx.fillText("WHATDO", 90, 160);
  ctx.font = "600 26px 'Space Grotesk', system-ui, sans-serif";
  ctx.fillStyle = col.secondary;
  ctx.fillText("My WhatDo · Identity Card", 90, 200);

  if (opts.displayName || opts.username) {
    ctx.font = "600 32px 'Space Grotesk', system-ui, sans-serif";
    ctx.fillStyle = col.secondary;
    ctx.textAlign = "right";
    ctx.fillText(
      `@${opts.username ?? opts.displayName ?? "friend"}`,
      w - 90,
      170,
    );
    ctx.textAlign = "left";
  }
  ctx.restore();

  // Archetype pill
  ctx.save();
  drawRoundedRect(ctx, 90, 300, 280, 78, 36);
  ctx.fillStyle = col.pill;
  ctx.fill();
  ctx.font = "800 34px 'Space Grotesk', system-ui, sans-serif";
  ctx.fillStyle = col.pillText;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`${emoji}  WHATDO TYPE`, 90 + 140, 300 + 39);
  ctx.restore();

  // Big label
  ctx.save();
  ctx.font = "900 104px 'Space Grotesk', system-ui, sans-serif";
  ctx.fillStyle = col.primary;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  const labelLines = wrapText(ctx, label, w - 180, 3);
  let yy = 460;
  for (const ln of labelLines) {
    ctx.fillText(ln, 90, yy);
    yy += 112;
  }
  // Tagline
  ctx.font = "500 38px 'Space Grotesk', system-ui, sans-serif";
  ctx.fillStyle = col.secondary;
  const tagLines = wrapText(ctx, tagline, w - 180, 2);
  for (const ln of tagLines) {
    ctx.fillText(ln, 90, yy + 18);
    yy += 52;
  }
  ctx.restore();

  // Stat trio card
  const cardTop = 960;
  ctx.save();
  ctx.globalAlpha = template === "MINIMAL" || template === "COLORFUL" ? 1 : 0.15;
  ctx.fillStyle = template === "MINIMAL" ? "#ffffff" : "#ffffff";
  drawRoundedRect(ctx, 90, cardTop, w - 180, 360, 44);
  if (template === "MINIMAL" || template === "COLORFUL") {
    ctx.strokeStyle = "rgba(15,23,42,0.08)";
    ctx.lineWidth = 2;
    ctx.stroke();
  } else {
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, 90, cardTop, w - 180, 360, 44);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  const statCol1 = textColors(template);
  const pctText = (p: number | null, suffix = "%") =>
    p == null ? "—" : `${Math.round(p)}${suffix}`;
  const trio = [
    {
      label: "Agreement",
      value: pctText(opts.agreementPct),
      sub: "others agree with your picks",
    },
    {
      label: "Rarity",
      value: pctText(opts.rarityPct),
      sub: "picks like yours are rare",
    },
    {
      label: "Strongest trait",
      value: String(opts.strongestTrait ?? "—").replaceAll("_", " "),
      sub: "from 5 signal scores",
    },
  ];
  const segW = (w - 180) / 3;
  trio.forEach((s, i) => {
    const cx = 90 + segW * i + segW / 2;
    ctx.save();
    ctx.textAlign = "center";
    ctx.font = "700 22px 'Space Grotesk', system-ui, sans-serif";
    ctx.fillStyle = i === 2 ? statCol1.accent : statCol1.secondary;
    ctx.fillText(s.label.toUpperCase(), cx, cardTop + 78);
    ctx.font = "900 66px 'Space Grotesk', system-ui, sans-serif";
    ctx.fillStyle = i === 2 ? statCol1.primary : statCol1.primary;
    const valueLines = wrapText(ctx, s.value, segW - 40, 2);
    let vy = cardTop + 160;
    for (const ln of valueLines) {
      ctx.fillText(ln, cx, vy);
      vy += 72;
    }
    ctx.font = "500 24px 'Space Grotesk', system-ui, sans-serif";
    ctx.fillStyle = statCol1.secondary;
    ctx.fillText(s.sub, cx, cardTop + 300);
    ctx.restore();
  });

  // Signals bar chart
  const barTop = 1400;
  ctx.save();
  ctx.font = "800 30px 'Space Grotesk', system-ui, sans-serif";
  ctx.fillStyle = col.primary;
  ctx.fillText("Your 5 core signals", 90, barTop);
  const signalsList = WHATDO_SIGNALS;
  let by = barTop + 40;
  const barMax = w - 90 - 320;
  for (const s of signalsList) {
    const val = Math.max(0, Math.min(100, opts.signalScores?.[s] ?? 0));
    ctx.font = "700 26px 'Space Grotesk', system-ui, sans-serif";
    ctx.fillStyle = col.secondary;
    const niceLabel = (SIGNAL_META as any)[s]?.label ?? String(s).replaceAll("_", " ");
    ctx.fillText(niceLabel + ` · ${Math.round(val)}`, 90, by + 26);
    ctx.save();
    const railX = w - 90 - barMax;
    drawRoundedRect(ctx, railX, by, barMax, 24, 12);
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = col.primary;
    ctx.fill();
    ctx.globalAlpha = 1;
    const fill = Math.max(6, (val / 100) * barMax);
    const grad = ctx.createLinearGradient(railX, 0, railX + barMax, 0);
    grad.addColorStop(0, col.accent);
    grad.addColorStop(1, col.primary);
    ctx.fillStyle = grad;
    drawRoundedRect(ctx, railX, by, fill, 24, 12);
    ctx.fill();
    ctx.restore();
    by += 52;
  }
  ctx.restore();

  // City + rare answers chips
  ctx.save();
  let chipX = 90;
  const chipY = 1710;
  const chips: { text: string; accent?: boolean }[] = [];
  if (opts.citySnapshot) {
    chips.push({
      text: `📍 ${opts.citySnapshot}${
        opts.cityAlignmentPct != null
          ? ` · ${Math.round(opts.cityAlignmentPct)}% city-aligned`
          : ""
      }`,
    });
  }
  if (opts.veryRareAnswersCount > 0) {
    chips.push({
      text: `🏆 ${opts.veryRareAnswersCount} very rare answer${
        opts.veryRareAnswersCount === 1 ? "" : "s"
      }`,
      accent: true,
    });
  } else if (opts.rareAnswersCount > 0) {
    chips.push({
      text: `💎 ${opts.rareAnswersCount} rare answer${
        opts.rareAnswersCount === 1 ? "" : "s"
      }`,
      accent: true,
    });
  }
  for (const c of chips) {
    ctx.font = "800 26px 'Space Grotesk', system-ui, sans-serif";
    ctx.textAlign = "left";
    const pad = 28;
    const metrics = ctx.measureText(c.text);
    const ch = 64;
    const cw = metrics.width + pad * 2;
    drawRoundedRect(ctx, chipX, chipY, cw, ch, 32);
    ctx.fillStyle = c.accent
      ? (template === "PREMIUM_DARK" ? "#fde68a" : "#f59e0b")
      : "rgba(255,255,255,0.85)";
    ctx.globalAlpha = template === "MINIMAL" || template === "COLORFUL" ? 1 : 0.92;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = c.accent
      ? "#1c1917"
      : (template === "MINIMAL" || template === "COLORFUL" ? "#0f172a" : "#0f172a");
    ctx.textBaseline = "middle";
    ctx.fillText(c.text, chipX + pad, chipY + ch / 2);
    chipX += cw + 20;
    ctx.textBaseline = "alphabetic";
  }
  ctx.restore();

  // Footer URL
  ctx.save();
  ctx.font = "700 26px 'Space Grotesk', system-ui, sans-serif";
  ctx.fillStyle = col.secondary;
  ctx.fillText("Take the quiz →", 90, h - 96);
  const host = "whatdo.co.in";
  const shareUrl = `https://${host}/${opts.shareToken ? "?ref=" + opts.shareToken : ""}`;
  ctx.font = "600 24px 'Space Grotesk', system-ui, sans-serif";
  ctx.textAlign = "right";
  ctx.fillStyle = col.secondary;
  ctx.fillText(shareUrl, w - 90, h - 96);
  ctx.restore();
}

export type { ResultSnapshot as ShareCardResultSnapshot };
export { ARCHETYPE_DEFINITIONS };
