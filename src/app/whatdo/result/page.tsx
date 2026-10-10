"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  drawShareCard,
  CARD_W,
  CARD_H,
  type ShareCardResultSnapshot,
  type ShareCardDrawExtra,
} from "@/lib/whatdo/share-canvas";
import type { WhatDoCardTemplate } from "@/lib/whatdo/ai-prompt";
import { CARD_TEMPLATES } from "@/lib/whatdo/ai-prompt";
import { getArchetypeDefinition } from "@/lib/whatdo/archetypes";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/design-system/Button";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Eye,
  Lock,
  MessageCircle,
  Share2,
  Sparkles,
  Trophy,
  Upload,
  UserRound,
  Users,
  Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLoginModal } from "@/components/auth/LoginModal";
import { ProgressBar } from "@/components/design-system/ProgressBar";
import { loadAvatarImage } from "@/lib/whatdo/share-canvas";
import { useToast } from "@/components/design-system/Toaster";
import { Modal } from "@/components/design-system/Modal";

function usePersistedWhatdoArgs() {
  const params = useSearchParams();
  const fromQuery = params?.get("id");
  const [hydrated, setHydrated] = React.useState(false);
  const [state, setState] = React.useState<{ identityId?: string; sessionId?: string }>({ identityId: fromQuery ?? undefined });
  React.useEffect(() => {
    let identityId: string | undefined = fromQuery ?? undefined;
    let sessionId: string | undefined;
    try {
      sessionId = window.localStorage.getItem("whatdo_sess") ?? undefined;
    } catch {
      sessionId = undefined;
    }
    if (!identityId) {
      try {
        const cached = window.sessionStorage.getItem("whatdo_last_identity");
        if (cached) identityId = cached;
      } catch {}
    }
    setState({ identityId, sessionId });
    setHydrated(true);
  }, [fromQuery]);
  return { ...state, hydrated };
}

export default function WhatDoResultPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { openLogin } = useLoginModal();
  const isLoggedIn = status === "authenticated";
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const [templateIdx, setTemplateIdx] = React.useState(1);
  const [copied, setCopied] = React.useState<"link" | "prompt" | "prompt-long" | null>(null);
  const [shareToken, setShareToken] = React.useState<string | null>(null);
  const [shareLoading, setShareLoading] = React.useState<"share" | "challenge" | "prompt" | null>(null);
  const [promptTab, setPromptTab] = React.useState<"short" | "long">("short");
  const persisted = usePersistedWhatdoArgs();
  const toast = useToast();

  const me = trpc.auth.me.useQuery(undefined, {
    staleTime: 60_000,
    enabled: isLoggedIn,
    retry: (count) => count < 3,
    retryDelay: (i) => 300 * (i + 1),
  });

  const identity = trpc.whatdo.getIdentity.useQuery(
    {
      identityId: persisted.identityId,
      sessionId: persisted.sessionId,
    },
    {
      staleTime: 30_000,
      retry: (count, e: any) => count < 4 && e?.data?.code !== "NOT_FOUND",
      retryDelay: (i) => 250 * (i + 1),
      enabled: persisted.hydrated && !!(persisted.identityId || persisted.sessionId || isLoggedIn),
    }
  );
  const calc = trpc.whatdo.calculateResult.useMutation({ retry: 2, retryDelay: 250 });
  const utils = trpc.useUtils();
  const genToken = trpc.whatdo.generateShareToken.useMutation({ retry: 2, retryDelay: 300 });
  const genPrompt = trpc.whatdo.generateAIPrompt.useQuery(
    { template: (CARD_TEMPLATES[templateIdx] as WhatDoCardTemplate), identityId: identity.data?.id ?? undefined },
    {
      enabled: !!identity.data?.id,
      staleTime: 60_000,
      retry: (count, e: any) => count < 3 && e?.data?.code !== "BAD_REQUEST" && e?.data?.code !== "UNAUTHORIZED",
      retryDelay: (i) => 350 * (i + 1),
    }
  );

  const trackClick = trpc.whatdo.trackShareClick.useMutation();
  const aiImageMut = trpc.whatdo.generateAIImage.useMutation();
  const presignSelfie = trpc.media.requestPresignedUpload.useMutation();
  const confirmSelfie = trpc.media.confirmUpload.useMutation();
  const updateProfileMut = trpc.auth.updateProfile.useMutation();
  const [aiImageResult, setAiImageResult] = React.useState<{
    publicUrl: string;
    fileKey: string;
    enhancedPrompt: string;
    sizeBytes: number;
    usedImg2Img?: boolean;
  } | null>(null);
  const [aiStage, setAiStage] = React.useState<null | "starting" | "prompt" | "rendering" | "compositing" | "uploading" | "done">(null);
  const [compositedPortraitUrl, setCompositedPortraitUrl] = React.useState<string | null>(null);
  const [compositedPortraitBlob, setCompositedPortraitBlob] = React.useState<Blob | null>(null);
  const [selfieExplicitlyUploaded, setSelfieExplicitlyUploaded] = React.useState<boolean>(false);
  const [showSelfieUploadModal, setShowSelfieUploadModal] = React.useState(false);
  const [selfieUploadState, setSelfieUploadState] = React.useState<"idle" | "compressing" | "presigning" | "uploading" | "saving" | "done" | "error">("idle");
  const [selfiePreview, setSelfiePreview] = React.useState<string | null>(null);
  const [selfieCdnUrl, setSelfieCdnUrl] = React.useState<string | null>(null);
  const [selfieFileKey, setSelfieFileKey] = React.useState<string | null>(null);
  const selfieFileInputRef = React.useRef<HTMLInputElement | null>(null);
  const pendingStartAfterUploadRef = React.useRef(false);

  const CDN_HOST_MARKERS = ["r2.dev", "cloudflare", "whatdo.co", "r2.cloudflarestorage"];

  const downloadAIImage = async () => {
    const useComposited = compositedPortraitBlob && compositedPortraitUrl;
    try {
      let blob: Blob;
      if (useComposited) {
        blob = compositedPortraitBlob!;
      } else {
        if (!aiImageResult?.publicUrl) return;
        const resp = await fetch(aiImageResult.publicUrl, { cache: "no-store" });
        if (!resp.ok) throw new Error("Fetch");
        blob = await resp.blob();
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `my-whatdo-${snapshot?.archetype ?? "identity"}-portrait.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch (e) {
      toast.show("Download failed — try opening the image and long-pressing Save.", "danger");
    }
  };

  const shareAIImage = async () => {
    const useComposited = compositedPortraitBlob && compositedPortraitUrl;
    try {
      let blob: Blob;
      if (useComposited) {
        blob = compositedPortraitBlob!;
      } else {
        if (!aiImageResult?.publicUrl) return;
        const resp = await fetch(aiImageResult.publicUrl, { cache: "no-store" });
        if (!resp.ok) throw new Error("Fetch");
        blob = await resp.blob();
      }
      const f = new File([blob], `my-whatdo-${snapshot?.archetype ?? "identity"}-portrait.png`, { type: blob.type || "image/png" });
      const shareData: ShareData & { files?: File[] } = {
        title: "My WhatDo Type",
        text: `I got ${snapshot?.archetype ?? "my WhatDo identity"} on WhatDo — take the quiz and see yours! ${shareUrl ?? ""}`,
        url: shareUrl ?? (typeof window !== "undefined" ? window.location.href : ""),
        files: [f],
      };
      if (typeof (navigator as any).canShare === "function" && (navigator as any).canShare({ files: [f] })) {
        await navigator.share(shareData);
        toast.show("Shared to WhatsApp/Instagram ✓", "success");
        return;
      }
      if (typeof navigator.share === "function") {
        try {
          await navigator.share(shareData);
          toast.show("Shared ✓", "success");
          return;
        } catch {}
      }
      try {
        await navigator.clipboard.writeText(
          `My WhatDo Type: ${snapshot?.archetype ?? ""} — ${shareUrl ?? (useComposited ? window.location.href : aiImageResult!.publicUrl)}`,
        );
        toast.show("Link copied. Download PNG + paste to WhatsApp/Instagram.", "info");
      } catch {
        toast.show("Use Download PNG then share manually.", "info");
      }
    } catch (e: any) {
      if (e && typeof e === "object" && (e as any).name === "AbortError") return;
      toast.show("Share didn't complete — try Download PNG instead.", "danger");
    }
  };

  async function compressImageToMaxBytes(
    file: File,
    opts: { maxSide: number; maxBytes: number; mime: string; quality: number },
  ): Promise<{ blob: Blob; dataUrlPreview: string }> {
    const { maxSide, maxBytes, mime, quality } = opts;
    const bitmap = await createImageBitmap(file);
    let { width, height } = bitmap;
    const scale = Math.min(1, maxSide / Math.max(width, height));
    width = Math.max(1, Math.round(width * scale));
    height = Math.max(1, Math.round(height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported");
    ctx.drawImage(bitmap, 0, 0, width, height);
    try {
      bitmap.close();
    } catch {}
    let finalBlob: Blob | null = null;
    let curQuality = quality;
    for (let i = 0; i < 6; i += 1) {
      const b: Blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          (bb) => (bb ? resolve(bb) : reject(new Error("toBlob null"))),
          mime,
          curQuality,
        );
      });
      finalBlob = b;
      if (b.size <= maxBytes || curQuality <= 0.45) break;
      curQuality = Math.max(0.45, curQuality - 0.08);
    }
    if (!finalBlob) throw new Error("Image compression failed");
    const dataUrlPreview = canvas.toDataURL(mime, Math.max(0.6, curQuality));
    return { blob: finalBlob, dataUrlPreview };
  }

  function loadHtmlImage(src: string, opts?: { crossOrigin?: string }): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      if (opts?.crossOrigin) img.crossOrigin = opts.crossOrigin;
      img.referrerPolicy = "no-referrer";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`img load failed: ${src.slice(0, 80)}`));
      img.src = src;
    });
  }

  async function runCompositePortraitPipeline(
    aiBgPublicUrl: string,
    self: { avatarImg: HTMLImageElement | null; selfieCdnUrl: string | null; snapshot: ShareCardResultSnapshot | null; templateIdx: number; shareToken: string | null },
  ): Promise<{ url: string; blob: Blob }> {
    if (!self.snapshot) throw new Error("Snapshot not ready");
    const aiBgImg = await loadHtmlImage(aiBgPublicUrl, { crossOrigin: "anonymous" });
    let selfieImg: HTMLImageElement | null = self.avatarImg;
    if (!selfieImg && self.selfieCdnUrl) {
      try { selfieImg = await loadAvatarImage(self.selfieCdnUrl); } catch {}
    }
    const canvas = document.createElement("canvas");
    canvas.width = CARD_W;
    canvas.height = CARD_H;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D canvas not supported");
    const tpl = CARD_TEMPLATES[self.templateIdx] as WhatDoCardTemplate;
    const extra: ShareCardDrawExtra = {
      backgroundImage: aiBgImg,
      skipBgTemplate: true,
      layoutMode: "portrait",
      hideTopIdentityBlock: true,
    };
    if (selfieImg) {
      extra.selfieImageOverride = selfieImg;
    }
    drawShareCard(ctx, tpl, { ...self.snapshot, shareToken: self.shareToken }, extra);
    const blob: Blob = await new Promise((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png", 0.95);
    });
    const url = URL.createObjectURL(blob);
    return { url, blob };
  }

  const onPickSelfie = () => {
    if (selfieUploadState === "compressing" || selfieUploadState === "presigning" || selfieUploadState === "uploading") return;
    selfieFileInputRef.current?.click();
  };

  const onSelfieFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.show("Unsupported file: Please upload a JPG, PNG, or WebP photo.", "danger");
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      toast.show("File too large: Please choose an image under 12MB.", "danger");
      return;
    }
    try {
      setSelfieUploadState("compressing");
      const mime = "image/jpeg";
      const compressed = await compressImageToMaxBytes(file, {
        maxSide: 512,
        maxBytes: 256 * 1024,
        mime,
        quality: 0.86,
      });
      setSelfiePreview(compressed.dataUrlPreview);
      setSelfieUploadState("idle");
    } catch (err) {
      setSelfieUploadState("error");
      const msg = err instanceof Error ? err.message : String(err);
      toast.show("Could not process image: " + (msg || "unknown error"), "danger");
    }
  };

  const onConfirmSelfieUpload = async () => {
    if (!selfiePreview) {
      toast.show("Pick a photo first.", "info");
      return;
    }
    try {
      if (!selfiePreview.startsWith("data:")) {
        setSelfieCdnUrl(selfiePreview);
        setSelfieExplicitlyUploaded(true);
        if (avatarImg) {
          // already loaded (was a preview from existing URL)
        } else {
          const img = await loadAvatarImage(selfiePreview);
          setAvatarImg(img);
        }
        setShowSelfieUploadModal(false);
        setSelfieUploadState("done");
        if (pendingStartAfterUploadRef.current) {
          pendingStartAfterUploadRef.current = false;
          void startGenAIImage();
        }
        return;
      }
      const mime = "image/jpeg";
      const res = await fetch(selfiePreview);
      const previewBlob = await res.blob();
      setSelfieUploadState("presigning");
      const presign = await presignSelfie.mutateAsync({
        type: "image",
        contentType: mime,
        fileSize: previewBlob.size,
        fileName: `selfie_${Date.now()}.jpg`,
      });
      setSelfieUploadState("uploading");
      const resp = await fetch(presign.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": mime },
        body: previewBlob,
      });
      if (!resp.ok) throw new Error(`Upload HTTP ${resp.status}`);
      await confirmSelfie.mutateAsync({ fileKey: presign.fileKey });
      const finalCdnUrl = presign.publicUrl || presign.fileKey;

      setSelfieUploadState("saving");
      if (isLoggedIn && finalCdnUrl && /^https?:\/\//i.test(finalCdnUrl)) {
        try {
          await updateProfileMut.mutateAsync({ avatarUrl: finalCdnUrl });
        } catch (profileErr: any) {
          const m = (profileErr?.message || String(profileErr || "")).toLowerCase();
          if (m.includes("username") || m.includes("displayname")) {
            try {
              const usernameNow = (me.data?.username as string | null) || (user?.username as string | null);
              const displayNow = (me.data?.displayName as string | null) || (user?.name as string | null) || (user?.displayName as string | null);
              const patch: any = { avatarUrl: finalCdnUrl };
              if (usernameNow && /^[a-zA-Z0-9_]{3,20}$/.test(usernameNow)) patch.username = usernameNow;
              if (displayNow && String(displayNow).length <= 50) patch.displayName = displayNow;
              await updateProfileMut.mutateAsync(patch);
            } catch {}
          }
        }
        try {
          await utils.auth.me.invalidate();
          await new Promise((r) => setTimeout(r, 150));
        } catch {}
      }

      setSelfieCdnUrl(finalCdnUrl);
      setSelfieFileKey(presign.fileKey);
      setSelfieExplicitlyUploaded(true);
      setAvatarImg(await loadAvatarImage(finalCdnUrl));
      setSelfieUploadState("done");
      setShowSelfieUploadModal(false);
      toast.show("Selfie saved to your profile — generating your AI portrait now.", "success");
      if (pendingStartAfterUploadRef.current) {
        pendingStartAfterUploadRef.current = false;
        void startGenAIImage();
      }
    } catch (err) {
      setSelfieUploadState("error");
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("Storage not configured") && selfiePreview) {
        try {
          const img = await loadAvatarImage(selfiePreview);
          setAvatarImg(img);
          setSelfieCdnUrl(selfiePreview);
          setSelfieExplicitlyUploaded(true);
          setShowSelfieUploadModal(false);
          setSelfieUploadState("done");
          if (pendingStartAfterUploadRef.current) {
            pendingStartAfterUploadRef.current = false;
            void startGenAIImage();
          }
          return;
        } catch {}
      }
      toast.show("Upload failed: " + (msg || "please try again."), "danger");
    }
  };

  const isLikelyRealUploadedAvatarUrl = (url: string | null | undefined): boolean => {
    if (!url) return false;
    if (typeof url !== "string") return false;
    if (url.startsWith("data:image/")) return true;
    if (!/^https?:\/\//i.test(url)) return false;
    const lower = url.toLowerCase();
    if (lower.includes("gravatar.com")) return false;
    if (/seed=|initials|svg\?|dicebear|ui-avatars|avatar\.placeholder|api\.dicebear|lo\.cal|placeholder/i.test(lower)) return false;
    return CDN_HOST_MARKERS.some((m) => lower.includes(m));
  };

  const startGenAIImage = async () => {
    if (!identity.data?.id && !shareToken) {
      toast.show("Still loading your result — try again in 2 seconds.", "info");
      return;
    }
    const existingRealAvatar = isLikelyRealUploadedAvatarUrl(
      me.data?.avatarUrl ?? user?.avatarUrl ?? user?.image ?? snapshot?.avatarUrl ?? null,
    );
    const hasAnySelfie = Boolean(
      selfieExplicitlyUploaded ||
      selfieCdnUrl ||
      (avatarImg && (selfieExplicitlyUploaded || existingRealAvatar)),
    );
    if (!hasAnySelfie) {
      pendingStartAfterUploadRef.current = true;
      setShowSelfieUploadModal(true);
      return;
    }
    setAiStage("starting");
    setAiImageResult(null);
    setCompositedPortraitUrl(null);
    setCompositedPortraitBlob(null);
    const stageTimers: NodeJS.Timeout[] = [];
    try {
      await new Promise((r) => setTimeout(r, 150));
      setAiStage("prompt");
      stageTimers.push(setTimeout(() => setAiStage("rendering"), 2200));
      stageTimers.push(setTimeout(() => setAiStage("compositing"), 14000));
      const fallbackAvatarUrl: string | null =
        (me.data?.avatarUrl as string | null) ||
        (user?.avatarUrl as string | null) ||
        (user?.image as string | null) ||
        (snapshot?.avatarUrl as string | null) ||
        null;
      const selfiePassCdn = selfieCdnUrl ?? (existingRealAvatar ? fallbackAvatarUrl : null);
      const selfiePassFileKey = selfieFileKey ?? undefined;
      const out = await aiImageMut.mutateAsync({
        identityId: identity.data?.id ?? undefined,
        shareToken: shareToken ?? undefined,
        template: (CARD_TEMPLATES[templateIdx] as WhatDoCardTemplate) ?? "BRIGHT_HERO",
        useShortPrompt: true,
        selfieCdnUrl: selfiePassCdn ?? undefined,
        selfieFileKey: selfiePassFileKey,
      });
      stageTimers.forEach(clearTimeout);
      if (!out?.publicUrl) throw new Error("Missing image URL");
      setAiStage("compositing");
      setAiImageResult({
        publicUrl: out.publicUrl,
        fileKey: out.fileKey,
        enhancedPrompt: out.enhancedPrompt,
        sizeBytes: out.sizeBytes,
        usedImg2Img: out.usedImg2Img,
      });
      let compositeSucceeded = false;
      try {
        const composite = await runCompositePortraitPipeline(out.publicUrl, {
          avatarImg,
          selfieCdnUrl,
          snapshot,
          templateIdx,
          shareToken,
        });
        setCompositedPortraitBlob(composite.blob);
        setCompositedPortraitUrl(composite.url);
        compositeSucceeded = true;
      } catch (compErr: any) {
        const m = (compErr?.message || String(compErr || "")).toLowerCase();
        if (m.includes("tainted") || m.includes("cross-origin") || m.includes("cors")) {
          toast.show("CDN blocked card branding overlay. Using raw AI render; retry in 30s for the branded portrait.", "warning");
        } else if (m.includes("avatar") || m.includes("selfie") || m.includes("img load failed")) {
          toast.show("Selfie image couldn't load for composite. Using raw AI render; regenerate to retry.", "warning");
        } else {
          toast.show("Branded overlay skipped: " + (String(compErr?.message || compErr).slice(0, 70) || "retrying may help"), "warning");
        }
        compositeSucceeded = false;
      }
      await new Promise((r) => setTimeout(r, compositeSucceeded ? 180 : 400));
      setAiStage("done");
      if (out.usedImg2Img && compositeSucceeded) {
        toast.show("Face-matched branded portrait ready — share to WhatsApp/Instagram!", "success");
      } else if (compositeSucceeded) {
        toast.show("Branded WhatDo portrait ready — tap Share/Download.", "success");
      } else if (out.usedImg2Img) {
        toast.show("Face-matched AI render ready. Overlay skipped but share works.", "success");
      } else {
        toast.show("AI portrait ready — Share or tap Regenerate for a face-matched version.", "info");
      }
    } catch (e: any) {
      stageTimers.forEach(clearTimeout);
      setAiStage(null);
      const msg: string =
        (e?.message as string) ??
        (e?.data?.code as string) ??
        "Image generation failed. Try again in a few seconds.";
      const m = msg.toLowerCase();
      if (
        m.includes("cf_api_token") ||
        m.includes("cf api token") ||
        m.includes("not enabled yet") ||
        m.includes("not configured") ||
        m.includes("disabled") ||
        (m.includes("set ") && (m.includes("token") || m.includes("env"))) ||
        m.includes("dash.cloudflare.com")
      ) {
        toast.show(
          "Workers AI not enabled yet — admin: add CF_API_TOKEN (Workers AI Write permission) at dash.cloudflare.com → paste into Vercel env vars → Redeploy. Canvas PNG still available below.",
          "danger",
          10000,
        );
      } else if (
        m.includes("timeout") ||
        m.includes("abort") ||
        m.includes("524 ") || m.endsWith("524") ||
        m.includes("522 ") || m.endsWith("522") ||
        m.includes("under load") ||
        m.includes("rate limit") ||
        m.includes("too many requests")
      ) {
        toast.show("Workers AI timed out — Cloudflare is under load. Retry in 10s or use Canvas PNG below.", "danger");
      } else if (
        m.includes("workers ai ") ||
        m.includes("workers ai:") ||
        m.startsWith("workers ai")
      ) {
        toast.show(
          "Workers AI rejected the render request. First check Cloudflare bill / token at dash.cloudflare.com (Workers AI Write permission, single Edit row). Retry now or use Canvas PNG below. Details: " +
            msg.slice(0, 120),
          "danger",
          9000,
        );
      } else if (m.includes("r2 storage") || m.includes("s3") || m.includes("putobject") || m.includes("bucket")) {
        toast.show(
          "Rendered the portrait but R2 CDN upload failed. Check R2_ACCESS_KEY_ID / R2_BUCKET env vars. Retrying or use Canvas PNG below.",
          "danger",
          8000,
        );
      } else if (m.includes("forbidden pattern") || m.includes("prompt validation")) {
        toast.show("Prompt validation was not passed internally — this should auto-fix on retry. Try again.", "danger");
      } else {
        toast.show(msg, "danger");
      }
    }
  };

  const user = session?.user as any;
  const rawIdentity = identity.data as any;
  const id: any = rawIdentity;

  React.useEffect(() => {
    if (genPrompt.error) {
      toast.show(
        "Couldn't build the AI prompt: " +
          ((genPrompt.error as any)?.message || (genPrompt.error as any)?.data?.code || "try again in a few seconds"),
        "danger",
      );
    }
  }, [genPrompt.error, toast]);

  React.useEffect(() => {
    if (identity.error && (identity.error as any)?.data?.code !== "NOT_FOUND") {
      const m = (identity.error as any)?.message || "";
      if (m.toLowerCase().includes("not found") || (identity.error as any)?.data?.code === "NOT_FOUND") return;
      toast.show("Still loading your WhatDo result… tap Retry below if needed", "info");
    }
  }, [identity.error, toast]);

  const ranOnceRef = React.useRef<Set<string>>(new Set());

  React.useEffect(() => {
    if (!persisted.hydrated) return;
    if (id) return;
    if (identity.isFetching || identity.isLoading) return;
    if (calc.isPending || calc.isSuccess || calc.isError) return;
    const canCompute = !!persisted.sessionId || isLoggedIn;
    if (!canCompute) return;
    const key = (persisted.sessionId ?? (user?.id as string) ?? "anon") as string;
    if (ranOnceRef.current.has(key)) return;
    ranOnceRef.current.add(key);
    const computeSafe = async () => {
      try {
        const sid = persisted.sessionId ?? "logged-in-fallback";
        const r = await calc.mutateAsync({ sessionId: sid, minQuestions: 10 });
        if (r.computed && r.identityId) {
          try { window.sessionStorage.setItem("whatdo_last_identity", r.identityId); } catch {}
          await utils.whatdo.getIdentity.invalidate({
            identityId: r.identityId,
            sessionId: persisted.sessionId ?? undefined,
          });
          const dest = new URLSearchParams({ id: r.identityId });
          router.replace(`/whatdo/result?${dest.toString()}`);
          return;
        }
        if (r.reason && (r as any).countAnswers && (r.reason === "INSUFFICIENT_DATA")) {
          router.push("/whatdo/quiz");
        }
      } catch {
      }
    };
    void computeSafe();
  }, [persisted.hydrated, id, persisted.sessionId, isLoggedIn]);

  const manualCompute = async () => {
    const canCompute = !!persisted.sessionId || isLoggedIn;
    if (!canCompute) {
      router.push("/whatdo/quiz");
      return;
    }
    const sid = persisted.sessionId ?? "logged-in-fallback";
    try {
      const r = await calc.mutateAsync({ sessionId: sid, minQuestions: 10 });
      if (r.computed && r.identityId) {
        try { window.sessionStorage.setItem("whatdo_last_identity", r.identityId); } catch {}
        await utils.whatdo.getIdentity.invalidate({
          identityId: r.identityId,
          sessionId: persisted.sessionId ?? undefined,
        });
        const dest = new URLSearchParams({ id: r.identityId });
        router.replace(`/whatdo/result?${dest.toString()}`);
        return;
      }
      if (r.reason) {
        router.push("/whatdo/quiz");
      }
    } catch {
      router.push("/whatdo/quiz");
    }
  };
  const snapshot: ShareCardResultSnapshot | null = id
    ? {
        displayName: (me.data?.displayName ?? user?.displayName ?? user?.name ?? null) as any,
        username: (me.data?.username ?? user?.username ?? null) as any,
        avatarUrl: (me.data?.avatarUrl ?? user?.avatarUrl ?? user?.image ?? null) as any,
        archetype: id.whatdoType as any,
        agreementPct: id.agreementPct ?? null,
        rarityPct: id.rarityPct ?? null,
        strongestTrait: id.strongestTrait ?? "—",
        signalScores: id.signalScores ?? {
          CURIOSITY: 50,
          RISK_TAKING: 50,
          CREATIVITY: 50,
          SOCIAL: 50,
          INDEPENDENCE: 50,
        },
        citySnapshot: id.citySnapshot ?? null,
        cityAlignmentPct: id.cityAlignmentPct ?? null,
        veryRareAnswersCount: 0,
        rareAnswersCount: 0,
        totalQuestions: id.totalQuestions ?? 0,
        shareToken: null,
        identityId: id.id,
      }
    : null;

  const [avatarImg, setAvatarImg] = React.useState<HTMLImageElement | null>(null);
  React.useEffect(() => {
    let cancelled = false;
    const src = snapshot?.avatarUrl ?? null;
    setAvatarImg(null);
    if (!src) return;
    void (async () => {
      const img = await loadAvatarImage(src);
      if (!cancelled) setAvatarImg(img);
    })();
    return () => {
      cancelled = true;
    };
  }, [snapshot?.avatarUrl]);

  React.useEffect(() => {
    if (isLoggedIn && id && !shareToken && !genToken.isPending) {
      const p = genToken.mutateAsync({});
      p.then((r) => {
        setShareToken(r.shareToken);
      }).catch(() => {});
    }
  }, [isLoggedIn, id, shareToken, genToken.isPending]);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !snapshot) return;
    canvas.width = CARD_W;
    canvas.height = CARD_H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const tpl = CARD_TEMPLATES[templateIdx] as WhatDoCardTemplate;
    drawShareCard(ctx, tpl, { ...snapshot, shareToken }, { avatarImg });
  }, [snapshot, templateIdx, shareToken, avatarImg]);

  if (identity.isFetching && !identity.data) {
    return (
      <main className="min-h-[100dvh] bg-slate-950 text-white flex items-center justify-center px-5">
        <div className="text-center space-y-3">
          <p className="text-sm text-white/70 font-semibold animate-pulse">
            Loading your WhatDo Type…
          </p>
          <ProgressBar value={55} className="h-1.5 w-64 mx-auto bg-white/10" />
          <p className="text-xs text-white/50">
            If nothing loads, go to <Link href="/whatdo/quiz" className="underline font-bold">take the quiz</Link>.
          </p>
        </div>
      </main>
    );
  }

  if (!snapshot) {
    const missingBecause = persisted.identityId
      ? identity.error && (identity.error as any)?.data?.code === "NOT_FOUND"
        ? "The result link expired or hasn't been saved yet. Re-compute below."
        : "Still loading your stored result."
      : persisted.sessionId || isLoggedIn
        ? "We couldn't find a computed result for your session yet."
        : "Answer 10+ questions to unlock your result.";
    return (
      <main className="min-h-[100dvh] bg-slate-950 text-white">
        <div className="mx-auto max-w-md px-5 py-12 text-center space-y-5">
        <Trophy className={cn("h-10 w-10 text-amber-300 mx-auto", calc.isPending && "animate-pulse opacity-70")} />
        <h1 className="text-2xl font-black tracking-tight">
          {calc.isPending ? "Computing your WhatDo Type…" : "No WhatDo Type yet"}
        </h1>
        <p className="text-sm text-white/70">
          {calc.isPending
            ? "Running the archetype classifier against your 12 answers. This takes ~5 seconds."
            : missingBecause}
        </p>
        <div className="w-full max-w-[240px] mx-auto">
          <ProgressBar
            value={calc.isPending ? 65 : 0}
            className={cn("h-1.5 bg-white/10", !calc.isPending && "opacity-30")}
          />
        </div>
        <div className="flex flex-col items-center gap-2 pt-2">
          {(persisted.sessionId || isLoggedIn) ? (
            <>
              <Button
                size="lg"
                onClick={manualCompute}
                disabled={calc.isPending}
              >
                {calc.isPending ? (
                  <><Eye className="h-4 w-4 mr-1.5 animate-pulse" /> Computing…</>
                ) : (
                  <>Retry compute my result</>
                )}
              </Button>
              <Button size="md" variant="outline" onClick={() => router.push("/whatdo/quiz")}>
                Go back to Quiz
              </Button>
            </>
          ) : (
            <>
              <Button size="lg" onClick={() => router.push("/whatdo/quiz")}>
                Go to Quiz
              </Button>
            </>
          )}
          <Button size="md" variant="ghost" onClick={() => router.push("/")}>
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to home
          </Button>
        </div>
        </div>
      </main>
    );
  }

  const arch = getArchetypeDefinition(snapshot.archetype as any);
  const shareUrl = shareToken
    ? `${process.env.NEXT_PUBLIC_URL ?? "https://whatdo.co.in"}/?ref=${shareToken}`
    : `${process.env.NEXT_PUBLIC_URL ?? "https://whatdo.co.in"}/whatdo`;

  const shareText =
    `I'm ${arch?.label ?? "a WhatDo-er"} on WHATDO — ${arch?.tagline ?? "Take the 2-min quiz"}. ${shareUrl}`;

  const safeTrackClick = (event: "CLICK" | "DOWNLOAD" | "PROMPT_COPY" | "CHALLENGE") => {
    if (!shareToken) return;
    try {
      trackClick.mutate({ shareToken, event });
    } catch {
    }
  };

  const downloadPNG = async () => {
    const c = canvasRef.current;
    if (!c) return;
    safeTrackClick("DOWNLOAD");
    const blob = await new Promise<Blob>((resolve, reject) => {
      c.toBlob((b) => (b ? resolve(b) : reject(new Error("blob"))), "image/png");
    });
    const a = document.createElement("a");
    const url = URL.createObjectURL(blob);
    a.href = url;
    const tplName = (CARD_TEMPLATES[templateIdx] ?? "MINIMAL").toLowerCase();
    a.download = `my-whatdo-${tplName}-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      a.remove();
    }, 500);
  };

  const buildSharePNG = async (): Promise<File | null> => {
    const c = canvasRef.current;
    if (!c) return null;
    const blob = await new Promise<Blob | null>((resolve) =>
      c.toBlob((b) => resolve(b), "image/png"),
    );
    if (!blob) return null;
    const name = `my-whatdo-${(CARD_TEMPLATES[templateIdx] ?? "MINIMAL").toLowerCase()}.png`;
    return new File([blob], name, { type: "image/png" });
  };

  const copyPngToClipboard = async (file: File): Promise<boolean> => {
    try {
      if (!(navigator as any).clipboard || !(window as any).isSecureContext) return false;
      const ClipboardItemCtor = (window as any).ClipboardItem;
      if (!ClipboardItemCtor) return false;
      await (navigator as any).clipboard.write([new ClipboardItemCtor({ [file.type]: file })]);
      return true;
    } catch {
      return false;
    }
  };

  const shareNative = async () => {
    safeTrackClick("CLICK");
    setShareLoading("share");
    try {
      const file = await buildSharePNG();
      const files = file ? [file] : [];
      const anyNav = navigator as any;
      const sharePayload: any = { title: "My WhatDo Type", text: shareText, url: shareUrl };
      if (files.length > 0 && anyNav.canShare && anyNav.canShare({ ...sharePayload, files })) {
        await anyNav.share({ ...sharePayload, files });
        toast.show("Shared your WhatDo card ✓", "success");
        return;
      }
      if (anyNav.share) {
        try {
          await anyNav.share(sharePayload);
          toast.show("Shared your WhatDo link ✓", "success");
          return;
        } catch {}
      }
      let pngCopied = false;
      if (file) pngCopied = await copyPngToClipboard(file);
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
        setCopied("link");
        setTimeout(() => setCopied(null), 1600);
        toast.show(pngCopied ? "PNG + link copied. Paste to WhatsApp/Instagram ✓" : "Link copied — paste to WhatsApp/Instagram and attach the downloaded PNG", pngCopied ? "success" : "info");
        return;
      }
      toast.show("Download the PNG and share manually — clipboard unavailable", "info");
    } catch (e: any) {
      toast.show(e?.message || "Share didn't complete — try Download PNG", "danger");
    } finally {
      setShareLoading(null);
    }
  };

  React.useEffect(() => {
    if (genPrompt.error) {
      toast.show(
        "Couldn't build the AI prompt: " + ((genPrompt.error as any)?.message ?? "Please refresh and try again"),
        "danger",
      );
    }
  }, [genPrompt.error]);

  const copyTextFallback = (text: string): boolean => {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.top = "0";
      ta.style.left = "0";
      ta.style.opacity = "0";
      ta.style.pointerEvents = "none";
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, text.length);
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  };

  const copyAIPrompt = async () => {
    if (genPrompt.error) {
      toast.show("AI prompt failed to build — refresh the page and try again", "danger");
      return;
    }
    if (!genPrompt.data?.shortPrompt && !genPrompt.data?.prompt) {
      toast.show(
        genPrompt.isFetching || genPrompt.isLoading
          ? "AI prompt still building — try again in 2 seconds"
          : "AI prompt not ready yet — try refreshing",
        "info",
      );
      return;
    }
    const text = genPrompt.data?.shortPrompt || genPrompt.data?.prompt || "";
    safeTrackClick("PROMPT_COPY");
    setShareLoading("prompt");
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const ok = copyTextFallback(text);
        if (!ok) throw new Error("fallback copy failed");
      }
      setCopied("prompt");
      setTimeout(() => setCopied(null), 1600);
      toast.show("AI IMAGE prompt copied ✓ Paste into ChatGPT / Gemini, then upload your selfie", "success");
    } catch {
      setPromptTab("short");
      setTimeout(() => {
        const el = document.querySelector<HTMLTextAreaElement>('textarea[readonly]');
        if (el) { el.focus(); el.select(); el.scrollIntoView({ behavior: "smooth", block: "center" }); }
      }, 60);
      toast.show("Clipboard permission blocked · text auto-selected below → press ⌘C (Mac) or Ctrl+C", "info");
    } finally {
      setShareLoading(null);
    }
  };

  const copyAIPromptLong = async () => {
    if (!genPrompt.data?.prompt) {
      toast.show("Full prompt still building", "info");
      return;
    }
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(genPrompt.data.prompt);
      } else {
        const ok = copyTextFallback(genPrompt.data.prompt);
        if (!ok) throw new Error("fallback copy failed");
      }
      setCopied("prompt-long");
      setTimeout(() => setCopied(null), 1600);
      toast.show("Full analysis prompt copied (answers + caption + breakdown) ✓", "success");
    } catch {
      setPromptTab("long");
      setTimeout(() => {
        const el = document.querySelector<HTMLTextAreaElement>('textarea[readonly]');
        if (el) { el.focus(); el.select(); el.scrollIntoView({ behavior: "smooth", block: "center" }); }
      }, 60);
      toast.show("Clipboard blocked · Full breakdown auto-selected below → press ⌘C (Mac) or Ctrl+C", "info");
    }
  };

  const challengeFriend = async () => {
    safeTrackClick("CHALLENGE");
    setShareLoading("challenge");
    try {
      const file = await buildSharePNG();
      const t = `Challenge accepted? 🎯 I just got "${arch?.label ?? "My WhatDo Type"}".\nTake the 2-min quiz and compare → ${shareUrl}`;
      const anyNav = navigator as any;
      const sharePayload = { title: "Challenge your WhatDo", text: t, url: shareUrl };
      if (file && anyNav.canShare && anyNav.canShare({ ...sharePayload, files: [file] })) {
        await anyNav.share({ ...sharePayload, files: [file] });
        toast.show("Challenge sent with your WhatDo card ✓", "success");
        return;
      }
      if (anyNav.share) {
        try {
          await anyNav.share(sharePayload);
          toast.show("Challenge shared ✓", "success");
          return;
        } catch {}
      }
      let pngCopied = false;
      if (file) pngCopied = await copyPngToClipboard(file);
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(t);
        setCopied("link");
        setTimeout(() => setCopied(null), 1600);
        toast.show(pngCopied ? "Challenge + PNG copied — paste to WhatsApp ✓" : "Challenge text copied. Also tap Download PNG then attach it in WhatsApp/Instagram Status", pngCopied ? "success" : "info");
        return;
      }
      toast.show("Download PNG and share the challenge link manually", "info");
    } catch (e: any) {
      toast.show(e?.message || "Challenge didn't send — try copying the link below", "danger");
    } finally {
      setShareLoading(null);
    }
  };

  return (
    <main className="min-h-[100dvh] w-full bg-gradient-to-b from-slate-950 via-indigo-950 to-fuchsia-950 text-white pb-24">
      <div className="mx-auto max-w-xl px-4 py-6 md:py-10 space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/whatdo" className="inline-flex items-center gap-1.5 text-sm font-bold text-white/85 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <p className="text-[11.5px] font-bold text-white/70">
            {isLoggedIn ? (
            <>
              <Users className="h-3.5 w-3.5 inline mr-1" /> Your card links friends land on home + referral credits
            </>
          ) : (
            <>
              <Lock className="h-3.5 w-3.5 inline mr-1" /> Login to unlock share tokens & referrals
            </>
          )}
          </p>
        </div>

        <header className="space-y-2 text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/15 px-3 py-1 text-[10.5px] font-black uppercase tracking-widest text-white/85">
            <Eye className="h-3 w-3" /> Your result
          </div>
          <h1 className="text-3xl sm:text-4xl font-black leading-tight tracking-tight">
            {arch?.emoji ?? "✨"} {arch?.label ?? snapshot.archetype}
          </h1>
          <p className="text-sm text-white/80 max-w-md mx-auto">
            {arch?.tagline ?? ""}
          </p>
        </header>

        <section className="space-y-3">
          <div className="flex items-center justify-between text-[11px] font-bold text-white/70 px-1">
          <span>Pick a card style</span>
          <div className="inline-flex items-center gap-1">
            <button
              type="button"
              onClick={() => setTemplateIdx((i) => (i - 1 + CARD_TEMPLATES.length) % CARD_TEMPLATES.length)}
              className="h-7 w-7 rounded-full bg-white/10 border border-white/15 hover:bg-white/15 flex items-center justify-center"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="px-2 min-w-[84px] text-center">
              {String(CARD_TEMPLATES[templateIdx] as WhatDoCardTemplate)}
            </span>
            <button
              type="button"
              onClick={() => setTemplateIdx((i) => (i + 1) % CARD_TEMPLATES.length)}
              className="h-7 w-7 rounded-full bg-white/10 border border-white/15 hover:bg-white/15 flex items-center justify-center"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-6 gap-2">
          {(CARD_TEMPLATES as readonly string[]).map((t, i) => (
            <button
              key={t}
              type="button"
              onClick={() => setTemplateIdx(i)}
              className={cn(
                "h-10 rounded-xl text-[10px] font-black tracking-widest transition-all border",
                i === templateIdx
                  ? "bg-white text-black border-white shadow scale-[1.02]"
                  : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10",
              )}
            >
              {t.split("_")[0]}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-3xl bg-black/30 border border-white/10 p-3">
        <div className="overflow-hidden rounded-2xl shadow-2xl shadow-black/50 bg-black">
          <canvas
            ref={canvasRef}
            width={CARD_W}
            height={CARD_H}
            className="w-full h-auto block"
          />
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-fuchsia-500/10 via-violet-500/10 to-indigo-500/10 p-4 space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-fuchsia-300" />
            <p className="text-[11.5px] font-black uppercase tracking-widest text-white/80">
              AI Portrait · One-click generate
            </p>
          </div>
          <p className="text-[10.5px] font-bold text-white/55">
            9:16 · 1080×1920
          </p>
        </div>

        {!aiImageResult && !aiStage && (
          <div className="space-y-3">
            <div className="relative aspect-[9/16] w-full max-w-[260px] mx-auto rounded-2xl border-2 border-dashed border-white/15 bg-black/30 flex flex-col items-center justify-center text-center px-6 gap-3 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-fuchsia-500/10 via-transparent to-indigo-500/10 pointer-events-none" />
              <div className="relative space-y-2">
                <div className="h-16 w-16 mx-auto rounded-full bg-gradient-to-br from-fuchsia-500 via-violet-500 to-indigo-500 p-[2px] shadow-xl shadow-fuchsia-900/40">
                  <div className="h-full w-full rounded-full bg-slate-950 flex items-center justify-center">
                    <Wand2 className="h-7 w-7 text-white/90" />
                  </div>
                </div>
                <p className="text-sm font-black text-white/90 leading-tight">
                  Your AI WhatDo portrait
                </p>
                <p className="text-[11.5px] font-semibold text-white/65 leading-relaxed">
                  Groq rewrites your identity prompt → Cloudflare Workers AI renders → R2 CDN hosts. Share to WhatsApp Status / Instagram Stories directly.
                </p>
              </div>
            </div>
            <Button
              size="lg"
              onClick={startGenAIImage}
              className="w-full rounded-3xl border border-white/30 bg-gradient-to-r from-fuchsia-500 via-violet-500 to-indigo-500 text-white shadow-xl shadow-black/50 hover:from-fuchsia-500/95 hover:via-violet-500/95 hover:to-indigo-500/95 font-black"
            >
              <Wand2 className="h-4.5 w-4.5 mr-1.5" /> ✨ Generate AI Image
            </Button>
          </div>
        )}

        {aiStage && !aiImageResult && (
          <div className="space-y-3.5">
            <div className="relative aspect-[9/16] w-full max-w-[260px] mx-auto rounded-2xl border border-white/10 bg-black/50 overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(217,70,239,0.18),transparent_55%),radial-gradient(ellipse_at_bottom,rgba(99,102,241,0.18),transparent_55%)] animate-pulse" />
              <div className="relative h-full w-full flex flex-col items-center justify-center text-center px-6 gap-3.5">
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-fuchsia-500/25 via-violet-500/25 to-indigo-500/25 border border-white/15 flex items-center justify-center backdrop-blur">
                  <Sparkles className="h-7 w-7 text-white/90 animate-spin" />
                </div>
                <div className="space-y-2 w-full max-w-[210px]">
                  <ProgressBar
                    value={
                      aiStage === "starting" ? 8
                        : aiStage === "prompt" ? 22
                        : aiStage === "rendering" ? 58
                        : aiStage === "uploading" ? 88
                        : 0
                    }
                    className="h-1.5 bg-white/10 w-full"
                  />
                  <p className="text-[11.5px] font-black text-white/90">
                    {aiStage === "starting" && "Warming up engines…"}
                    {aiStage === "prompt" && "1/3 · Enhancing prompt via Groq LLM…"}
                    {aiStage === "rendering" && "2/3 · Painting portrait on Cloudflare Workers AI…"}
                    {aiStage === "uploading" && "3/3 · Saving to R2 CDN…"}
                    {aiStage === "done" && "Complete"}
                  </p>
                  <p className="text-[10.5px] font-semibold text-white/55 leading-relaxed">
                    Usually 12–25 seconds. If Workers AI is under load, this can take 60s.
                  </p>
                </div>
              </div>
            </div>
            <Button
              size="lg"
              disabled
              className="w-full rounded-3xl border border-white/20 bg-white/5 text-white/70 shadow-lg shadow-black/40 font-black cursor-not-allowed"
            >
              <Sparkles className="animate-spin opacity-70 h-4.5 w-4.5 mr-1.5" /> Generating…
            </Button>
          </div>
        )}

        {aiImageResult && (
          <div className="space-y-3.5">
            <div className="relative aspect-[9/16] w-full max-w-[260px] mx-auto rounded-2xl border-2 border-white/15 bg-black shadow-2xl shadow-black/60 overflow-hidden">
              <img
                src={compositedPortraitUrl ?? aiImageResult.publicUrl}
                alt={`${snapshot?.archetype ?? "WhatDo"} AI portrait`}
                className="h-full w-full object-cover block"
                onError={(e) => {
                  if (!compositedPortraitUrl || e.currentTarget.src === compositedPortraitUrl) {
                    (e.currentTarget as HTMLImageElement).style.opacity = "0.3";
                  }
                }}
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/50 to-transparent" />
              <div className="pointer-events-none absolute bottom-2 left-2 right-2 flex items-end justify-between">
                <div className="rounded-full bg-black/50 backdrop-blur px-2 py-0.5 border border-white/15">
                  <p className="text-[9px] font-black uppercase tracking-widest text-white/90">
                    {aiImageResult.usedImg2Img ? "Face-matched" : (compositedPortraitUrl ? "Branded card" : "AI render")}
                    {" · "}
                    {aiImageResult.sizeBytes ? `${(aiImageResult.sizeBytes / 1024).toFixed(0)} KB` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={startGenAIImage}
                  className="rounded-full bg-black/50 backdrop-blur px-2.5 py-1 border border-white/15 text-[10px] font-black text-white/90 hover:bg-black/70 transition-colors"
                >
                  ↻ Regenerate
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <Button
                size="lg"
                onClick={downloadAIImage}
                className="rounded-full bg-white text-black hover:bg-white/95 border-0 shadow-xl shadow-black/30 font-black"
              >
                <Download className="h-4.5 w-4.5 mr-1.5" /> Download
              </Button>
              <Button
                size="lg"
                onClick={shareAIImage}
                className="rounded-full border border-white/20 bg-white/5 text-white hover:bg-white/10 font-black"
              >
                <Share2 className="h-4.5 w-4.5 mr-1.5" /> Share
              </Button>
            </div>
            <div className="flex items-center justify-center pt-0.5">
              <button
                type="button"
                onClick={startGenAIImage}
                className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/55 hover:text-white underline-offset-4 hover:underline decoration-white/25"
              >
                ↻ Generate a different AI portrait
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="grid grid-cols-2 gap-2.5">
        <Button size="lg" onClick={downloadPNG} className="rounded-full bg-white text-black hover:bg-white/95 border-0 shadow-xl shadow-black/30">
          <Download className="h-4.5 w-4.5" /> Download PNG
        </Button>
        <Button
          size="lg"
          onClick={shareNative}
          loading={shareLoading === "share"}
          className="rounded-full border border-white/20 bg-white/5 text-white hover:bg-white/10"
        >
          <Share2 className="h-4.5 w-4.5" /> Share
        </Button>
        <Button
          size="md"
          onClick={copyAIPrompt}
          disabled={!genPrompt.data?.shortPrompt && !genPrompt.data?.prompt || shareLoading === "prompt"}
          loading={shareLoading === "prompt"}
          className="rounded-full border border-white/30 bg-gradient-to-r from-fuchsia-500/70 via-violet-500/70 to-indigo-500/70 hover:from-fuchsia-500/90 hover:via-violet-500/90 hover:to-indigo-500/90 text-white shadow-lg shadow-black/40 disabled:opacity-60 disabled:cursor-not-allowed font-bold"
        >
          {copied === "prompt" ? (
            <>
              <Check className="h-4 w-4" /> Prompt copied
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" /> Copy AI IMAGE PROMPT
            </>
          )}
        </Button>
        <Button
          size="md"
          onClick={challengeFriend}
          loading={shareLoading === "challenge"}
          className="rounded-full border border-white/30 bg-white/10 text-white hover:bg-white/20 shadow-lg shadow-black/30"
        >
          <MessageCircle className="h-4 w-4" /> Challenge a friend
        </Button>
      </section>

      <div className="flex items-center justify-center -mt-3">
        <button
          type="button"
          onClick={copyAIPromptLong}
          className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/55 hover:text-white underline-offset-4 hover:underline decoration-white/30"
        >
          Or copy the FULL prompt with all 12 answers + caption →
        </button>
      </div>

      {!isLoggedIn && (
        <section className="rounded-3xl border border-fuchsia-400/20 bg-fuchsia-500/10 p-5 space-y-3">
          <p className="text-sm font-black text-white">
            🔒 Login to get your personal referral link
          </p>
          <p className="text-xs text-white/80">
            Share cards signed in append your token. Every friend that signs up & completes WhatDo earns
            you the referral and unlocks more detailed analytics on your influence.
          </p>
          <Button size="md" onClick={() => openLogin()} className="rounded-full w-full">
            Login now <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </section>
      )}

      {isLoggedIn && shareToken && (
        <section className="rounded-3xl bg-white/5 border border-white/10 p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-widest text-white/70">
              Your share link
            </p>
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(shareUrl);
                setCopied("link");
                setTimeout(() => setCopied(null), 1400);
              }}
              className="inline-flex items-center gap-1 text-[11.5px] font-bold text-white/85 hover:text-white transition-colors"
            >
              {copied === "link" ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-300" /> Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" /> Copy
                </>
              )}
            </button>
          </div>
          <p className="text-xs text-fuchsia-200 font-mono break-all bg-black/30 rounded-xl border border-white/10 px-3 py-2">
            {shareUrl}
          </p>
        </section>
      )}

      {(genPrompt.data?.shortPrompt || genPrompt.data?.prompt) && (
        <section className="rounded-3xl bg-white/5 border border-white/10 p-5 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1 rounded-full bg-black/20 p-1 border border-white/10">
              <button
                type="button"
                onClick={() => setPromptTab("short")}
                className={`rounded-full px-3 py-1 text-[11.5px] font-black transition-all ${
                  promptTab === "short"
                    ? "bg-gradient-to-r from-fuchsia-500 to-indigo-500 text-white shadow-md shadow-fuchsia-900/40"
                    : "text-white/65 hover:text-white"
                }`}
              >
                ✏️ AI IMAGE PROMPT · {(genPrompt.data?.shortPrompt?.length ?? 0) < 1000 ? (genPrompt.data?.shortPrompt?.length ?? 0) : (genPrompt.data?.shortPrompt?.length ?? 0)} chars
              </button>
              <button
                type="button"
                onClick={() => setPromptTab("long")}
                className={`rounded-full px-3 py-1 text-[11.5px] font-black transition-all ${
                  promptTab === "long"
                    ? "bg-white/15 text-white"
                    : "text-white/65 hover:text-white"
                }`}
              >
                📋 FULL BREAKDOWN + Answers · {(genPrompt.data?.prompt?.length ?? 0)} chars
              </button>
            </div>
            <div className="flex items-center gap-1">
              {promptTab === "short" ? (
                <button
                  type="button"
                  onClick={copyAIPrompt}
                  className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-white/20"
                >
                  {copied === "prompt" ? <><Check className="h-3 w-3 inline mr-1 text-emerald-300" /> Copied</> : <><Copy className="h-3 w-3 inline mr-1" /> Copy short</>}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={copyAIPromptLong}
                  className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-white/20"
                >
                  {copied === "prompt-long" ? <><Check className="h-3 w-3 inline mr-1 text-emerald-300" /> Copied</> : <><Copy className="h-3 w-3 inline mr-1" /> Copy full</>}
                </button>
              )}
            </div>
          </div>
          <textarea
            readOnly
            rows={promptTab === "short" ? 18 : 28}
            spellCheck={false}
            className="w-full rounded-2xl border border-white/10 bg-black/30 p-4 text-[12.5px] leading-relaxed text-white/90 font-mono resize-y focus:outline-none focus:ring-2 focus:ring-fuchsia-400/40 selection:bg-fuchsia-500/30"
            value={promptTab === "short" ? (genPrompt.data.shortPrompt || genPrompt.data.prompt || "") : (genPrompt.data.prompt || "")}
            onFocus={(e) => e.currentTarget.select()}
          />
          <p className="text-[11px] text-amber-200/80 font-semibold leading-snug">
            {genPrompt.data.validated ? "Validated: Yes · WhatDo checks for forbidden claims." : "Validated: Review before use."}
            {" · "}
            To use: paste into ChatGPT / Gemini / Ideogram <u>as plain text</u> (not as a .txt attachment), then upload your selfie in the same message and hit Send.
          </p>
        </section>
      )}

      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2">
        <Button size="md" variant="ghost" onClick={() => router.push("/whatdo/quiz")} className="rounded-full">
          ↻ Re-take quiz
        </Button>
        <Button size="md" onClick={() => router.push("/")} className="rounded-full">
          <ArrowRight className="h-4 w-4 ml-1" /> Back to feed
        </Button>
      </div>
    </div>

    <input
      ref={selfieFileInputRef}
      type="file"
      accept="image/*"
      className="hidden"
      onChange={onSelfieFile}
    />

    <Modal
      open={showSelfieUploadModal}
      onClose={() => {
        if (selfieUploadState === "compressing" || selfieUploadState === "presigning" || selfieUploadState === "uploading" || selfieUploadState === "saving") return;
        pendingStartAfterUploadRef.current = false;
        setShowSelfieUploadModal(false);
      }}
      size="sm"
      title="Upload a selfie"
      description="We'll use your photo to generate an AI portrait that looks like you. Face-aware rendering + branded WhatDo card."
      footer={
        <div className="flex w-full items-center gap-2">
          <Button
            size="lg"
            variant="outline"
            onClick={() => {
              if (selfieUploadState === "compressing" || selfieUploadState === "presigning" || selfieUploadState === "uploading" || selfieUploadState === "saving") return;
              pendingStartAfterUploadRef.current = false;
              setShowSelfieUploadModal(false);
            }}
            className="flex-1 rounded-full"
            disabled={selfieUploadState === "compressing" || selfieUploadState === "presigning" || selfieUploadState === "uploading" || selfieUploadState === "saving"}
          >
            Cancel
          </Button>
          <Button
            size="lg"
            onClick={onConfirmSelfieUpload}
            className="flex-1 rounded-full bg-gradient-to-r from-fuchsia-500 via-violet-500 to-indigo-500 text-white font-black border-0 shadow-xl shadow-black/30 hover:from-fuchsia-500/95 hover:via-violet-500/95 hover:to-indigo-500/95"
            disabled={
              !selfiePreview ||
              selfieUploadState === "compressing" ||
              selfieUploadState === "presigning" ||
              selfieUploadState === "uploading" ||
              selfieUploadState === "saving"
            }
          >
            {selfieUploadState === "compressing" && "Compressing…"}
            {selfieUploadState === "presigning" && "Preparing upload…"}
            {selfieUploadState === "uploading" && "Uploading…"}
            {selfieUploadState === "saving" && (isLoggedIn ? "Saving to profile…" : "Preparing…")}
            {selfieUploadState === "done" && "Saved ✓"}
            {selfieUploadState === "error" && "Retry"}
            {(selfieUploadState === "idle" || selfieUploadState === "done") && selfiePreview ? "Save & Generate →" : "Pick a photo"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <button
          type="button"
          onClick={onPickSelfie}
          className="group relative block w-full aspect-square rounded-3xl border-2 border-dashed border-white/15 bg-gradient-to-br from-fuchsia-500/10 via-violet-500/10 to-indigo-500/10 hover:border-white/25 hover:from-fuchsia-500/15 hover:via-violet-500/15 hover:to-indigo-500/15 transition-all overflow-hidden"
        >
          {selfiePreview ? (
            <img
              src={selfiePreview}
              alt="Selfie preview"
              className="absolute inset-0 h-full w-full object-cover rounded-[22px] p-1.5"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-fuchsia-500/25 via-violet-500/25 to-indigo-500/25 border border-white/15 flex items-center justify-center group-hover:scale-[1.03] transition-transform">
                {me.data?.avatarUrl || snapshot?.avatarUrl ? (
                  <UserRound className="h-7 w-7 text-white/85" />
                ) : (
                  <Upload className="h-7 w-7 text-white/85" />
                )}
              </div>
              <div className="space-y-1">
                <p className="text-sm font-black text-white/90 leading-tight">
                  {me.data?.avatarUrl || snapshot?.avatarUrl ? "Use profile avatar or pick new" : "Tap to pick a selfie"}
                </p>
                <p className="text-[11.5px] font-semibold text-white/60 leading-relaxed">
                  Clear face photo works best · JPG/PNG under 12MB · Auto-compressed
                </p>
              </div>
            </div>
          )}
          {selfiePreview && (
            <div className="pointer-events-none absolute top-3 right-3">
              <div className="rounded-full bg-black/55 backdrop-blur px-2.5 py-1 border border-white/15">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/90">
                  Tap to change
                </p>
              </div>
            </div>
          )}
        </button>

        {(me.data?.avatarUrl || snapshot?.avatarUrl) && (
          <button
            type="button"
            onClick={async () => {
              const url = (me.data?.avatarUrl || snapshot?.avatarUrl)!;
              setSelfiePreview(url);
              setSelfieUploadState("idle");
            }}
            className="w-full flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/85 py-3 px-4 transition-colors"
          >
            <UserRound className="h-4 w-4" />
            <p className="text-[12px] font-bold tracking-wide">Use my existing profile avatar</p>
          </button>
        )}

        {selfieUploadState === "error" && (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3">
            <p className="text-[11.5px] font-semibold text-rose-200 leading-relaxed">
              That didn't work. Try another photo or keep it under 12MB.
            </p>
          </div>
        )}

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 space-y-1.5">
          <p className="text-[10.5px] font-black uppercase tracking-[0.12em] text-white/55">
            What happens next
          </p>
          <ol className="space-y-1 text-[11.5px] font-semibold text-white/70 leading-relaxed">
            <li>1️⃣ Selfie + identity prompt → Cloudflare Workers AI img2img</li>
            <li>2️⃣ Client-side canvas overlays WhatDo branding + your avatar + signal bars</li>
            <li>3️⃣ One-tap share to WhatsApp Status / Instagram Stories</li>
          </ol>
        </div>
      </div>
    </Modal>
  </main>
  );
}
