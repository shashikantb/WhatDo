"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useFormState, useFormStatus } from "react-dom";
import { signIn, useSession } from "next-auth/react";
import {
  Mail,
  Lock,
  User,
  UserCircle,
  Eye,
  EyeOff,
  Chrome,
  Upload,
  X,
  ImageIcon,
  Loader2,
} from "lucide-react";
import { registerUser } from "@/lib/actions/auth.actions";
import { cn, purgeStaleAuthCookies } from "@/lib/utils";
import { useToast } from "@/components/design-system/Toaster";
import { trpc } from "@/lib/trpc/client";

const registerFormSchema = z
  .object({
    username: z
      .string()
      .min(3, "Username must be at least 3 characters")
      .max(30, "Username must be at most 30 characters")
      .regex(
        /^[a-zA-Z0-9_]+$/,
        "Only letters, numbers, and underscores allowed"
      ),
    displayName: z
      .string()
      .min(2, "Display name must be at least 2 characters")
      .max(50, "Display name must be at most 50 characters"),
    email: z.string().email("Invalid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(100, "Password must be at most 100 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterFormValues = z.infer<typeof registerFormSchema>;

async function compressImageToMaxBytes(
  file: File,
  opts: { maxSide?: number; maxBytes?: number; mime?: string; quality?: number } = {}
): Promise<{ blob: Blob; dataUrl: string }> {
  const { maxSide = 512, maxBytes = 256 * 1024, mime = "image/jpeg", quality = 0.86 } = opts;
  const bitmap = await (globalThis as any).createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const dw = Math.round(bitmap.width * scale);
  const dh = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = dw;
  canvas.height = dh;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, dw, dh);
  let q = quality;
  let bestBlob: Blob | null = null;
  while (q >= 0.4) {
    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), mime, q),
    );
    if (blob) {
      bestBlob = blob;
      if (blob.size <= maxBytes) break;
    }
    q -= 0.08;
  }
  if (!bestBlob) {
    throw new Error("Could not compress the image.");
  }
  const reader = new FileReader();
  const dataUrlP = new Promise<string>((resolve, reject) => {
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(String(reader.result));
  });
  reader.readAsDataURL(bestBlob);
  return { blob: bestBlob, dataUrl: await dataUrlP };
}

function SubmitButton({
  children,
  variant = "primary",
  disabled,
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary";
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  const baseStyles =
    "w-full py-3 px-4 rounded-xl font-semibold text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2";
  const variants = {
    primary:
      "bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 shadow-lg shadow-violet-500/25",
    secondary:
      "bg-slate-800 hover:bg-slate-700 border border-slate-700",
  };
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className={`${baseStyles} ${variants[variant]}`}
    >
      {pending && (
        <Loader2 className="h-4 w-4 animate-spin" />
      )}
      {children}
    </button>
  );
}

export interface RegisterFormProps {
  onOAuthClick?: (provider: string) => void;
  onSuccess?: () => void;
  isModal?: boolean;
  className?: string;
  postRegisterRedirect?: string;
  defaultTab?: "login" | "register";
  onSwitchTab?: (tab: "login" | "register") => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({
  onOAuthClick,
  onSuccess,
  isModal = false,
  className,
  postRegisterRedirect,
}) => {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState<boolean>(false);
  const [avatarStage, setAvatarStage] = useState<string>("");
  const [createdSessionRedirect, setCreatedSessionRedirect] = useState<string | null>(null);
  const toast = useToast();
  const presignAvatar = trpc.media.requestPresignedUpload.useMutation();
  const confirmAvatar = trpc.media.confirmUpload.useMutation();
  const { data: session } = useSession();
  const isLoggedIn = !!session?.user;

  const [registerState, registerAction] = useFormState(registerUser, {
    success: false,
    message: "",
    issues: {},
  });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      username: "",
      displayName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const emailVal = watch("email");
  const passwordVal = watch("password");

  const onAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.show("Please pick an image file (PNG, JPG, or WebP)", "danger");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.show("Photo must be smaller than 8 MB", "danger");
      return;
    }
    setAvatarUploading(true);
    setAvatarStage("Compressing…");
    try {
      const { blob, dataUrl } = await compressImageToMaxBytes(file, {
        maxSide: 512,
        maxBytes: 256 * 1024,
        mime: "image/jpeg",
        quality: 0.86,
      });
      setAvatarPreview(dataUrl);
      let finalUrl: string | null = null;
      if (isLoggedIn) {
        setAvatarStage("Preparing upload…");
        const ps = await presignAvatar.mutateAsync({
          type: "image",
          contentType: "image/jpeg",
          fileSize: blob.size,
          fileName: `avatar-${Date.now()}.jpg`,
        });
        setAvatarStage("Uploading…");
        const putRes = await fetch(ps.uploadUrl, {
          method: "PUT",
          body: blob,
          headers: { "Content-Type": "image/jpeg" },
        });
        if (!putRes.ok) throw new Error("Upload failed");
        try {
          await confirmAvatar.mutateAsync({ fileKey: ps.fileKey });
        } catch {}
        finalUrl = ps.publicUrl;
      } else {
        if (blob.size > 128 * 1024) {
          const smaller = await compressImageToMaxBytes(file, {
            maxSide: 384,
            maxBytes: 128 * 1024,
            mime: "image/jpeg",
            quality: 0.72,
          });
          finalUrl = smaller.dataUrl;
          setAvatarPreview(smaller.dataUrl);
        } else {
          finalUrl = dataUrl;
        }
      }
      setAvatarUrl(finalUrl);
      toast.show("Profile photo added to your WhatDo card ✓", "success");
    } catch (err: any) {
      toast.show(err?.message || "Couldn't prepare your photo — try a smaller file", "danger");
      setAvatarPreview(null);
      setAvatarUrl(null);
    } finally {
      setAvatarUploading(false);
      setAvatarStage("");
    }
  };

  const onSubmit = (data: RegisterFormValues) => {
    const formData = new FormData();
    formData.append("username", data.username);
    formData.append("displayName", data.displayName);
    formData.append("email", data.email);
    formData.append("password", data.password);
    formData.append("confirmPassword", data.confirmPassword);
    if (avatarUrl) formData.append("avatarUrl", avatarUrl);
    (registerAction as any)(formData);
  };

  if (registerState.success && !createdSessionRedirect) {
    const doAutoLogin = async () => {
      const dest =
        postRegisterRedirect || (registerState as any).redirectTo || "/onboarding";
      if (emailVal && passwordVal) {
        try {
          const r = await signIn("credentials", {
            email: emailVal,
            password: passwordVal,
            redirect: false,
          });
          if (r?.ok) {
            toast.show("Welcome to WhatDo! 🎉 Your account is ready.", "success", 3500);
          } else {
            toast.show("Account created — please sign in to continue.", "info");
          }
        } catch {
          toast.show("Account created — please sign in to continue.", "info");
        }
      } else {
        toast.show("Account created. Sign in to continue.", "info");
      }
      setCreatedSessionRedirect(dest);
      try { purgeStaleAuthCookies(); } catch {}
      if (onSuccess) onSuccess();
    };
    void doAutoLogin();
  }

  useEffect(() => {
    if (!createdSessionRedirect) return;
    const id = window.setTimeout(() => {
      router.push(createdSessionRedirect);
      router.refresh();
    }, 650);
    return () => window.clearTimeout(id);
  }, [createdSessionRedirect, router]);

  if (createdSessionRedirect) {
    return (
      <div className="space-y-4 text-center py-4">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/30 animate-[pulse_1.6s_ease-in-out_infinite]">
          <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7 text-white">
            <path d="M5 12l4 4L19 6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div>
          <p className="text-lg font-black text-white">You&apos;re in!</p>
          <p className="text-sm text-slate-400 mt-1">
            Taking you to {createdSessionRedirect === "/onboarding" ? "onboarding" : "your result"}…
          </p>
        </div>
      </div>
    );
  }

  const handleOAuthDefault = async (provider: string) => {
    if (onOAuthClick) {
      onOAuthClick(provider);
    } else {
      await signIn(provider, { callbackUrl: postRegisterRedirect || "/onboarding" });
    }
  };

  const changeLabel =
    avatarUploading && avatarStage
      ? avatarStage
      : avatarPreview
      ? "Change"
      : "Upload photo";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={cn("space-y-4", className)}>
      {registerState.message && !registerState.success && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm">
          <div className="font-semibold">{registerState.message}</div>
          {Object.keys(registerState.issues ?? {}).length > 0 && (
            <ul className="mt-2 list-disc list-inside space-y-0.5 text-xs">
              {Object.entries(registerState.issues ?? {}).map(([key, msg]) => (
                <li key={key}>
                  <span className="font-medium capitalize">{key}:</span> {msg}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <label className="block">
        <span className="block text-sm font-medium text-slate-300 mb-2">
          Profile photo <span className="text-slate-500 font-normal">· appears on your WhatDo share card</span>
        </span>
        <div className="flex items-center gap-4 rounded-2xl border border-dashed border-slate-700 bg-slate-800/30 p-3">
          <div className={cn(
            "shrink-0 h-16 w-16 rounded-2xl overflow-hidden flex items-center justify-center bg-slate-800 border border-slate-700",
            !avatarPreview && "text-slate-500"
          )}>
            {avatarPreview ? (
              <img src={avatarPreview} alt="avatar preview" className="h-full w-full object-cover" />
            ) : (
              <ImageIcon className="h-7 w-7" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-400">
              {avatarPreview ? "Looks great! This will show on your result card PNG after you sign up." : "Optional but recommended — your face makes share cards way more personal."}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <label className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors",
                "bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100",
                avatarUploading && "opacity-60 cursor-not-allowed"
              )}>
                {avatarUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                {changeLabel}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onAvatarFile}
                  disabled={avatarUploading}
                />
              </label>
              {avatarPreview && !avatarUploading && (
                <button
                  type="button"
                  onClick={() => {
                    setAvatarPreview(null);
                    setAvatarUrl(null);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-slate-400 hover:text-slate-200 border border-slate-700 hover:border-slate-600 bg-slate-800/40"
                >
                  <X className="h-3 w-3" /> Remove
                </button>
              )}
            </div>
          </div>
        </div>
      </label>

      <div className={cn("grid gap-4", isModal ? "grid-cols-1" : "grid-cols-2")}>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Username
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              {...register("username")}
              type="text"
              placeholder="johndoe"
              className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
            />
          </div>
          {(errors.username || registerState.issues?.username) && (
            <p className="mt-1.5 text-sm text-red-400">
              {registerState.issues?.username || errors.username?.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Display Name
          </label>
          <div className="relative">
            <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              {...register("displayName")}
              type="text"
              placeholder="John Doe"
              className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
            />
          </div>
          {(errors.displayName || registerState.issues?.displayName) && (
            <p className="mt-1.5 text-sm text-red-400">
              {registerState.issues?.displayName || errors.displayName?.message}
            </p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Email
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            {...register("email")}
            type="email"
            placeholder="you@example.com"
            className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
          />
        </div>
        {(errors.email || registerState.issues?.email) && (
          <p className="mt-1.5 text-sm text-red-400">
            {registerState.issues?.email || errors.email?.message}
          </p>
        )}
      </div>

      <div className={cn("grid gap-4", isModal ? "grid-cols-1" : "grid-cols-2")}>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              {...register("password")}
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-10 pr-12 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>
          {(errors.password || registerState.issues?.password) && (
            <p className="mt-1.5 text-sm text-red-400">
              {registerState.issues?.password || errors.password?.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Confirm Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              {...register("confirmPassword")}
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
            />
          </div>
          {(errors.confirmPassword || registerState.issues?.confirmPassword) && (
            <p className="mt-1.5 text-sm text-red-400">
              {registerState.issues?.confirmPassword || errors.confirmPassword?.message}
            </p>
          )}
        </div>
      </div>

      <SubmitButton disabled={avatarUploading}>
        {avatarUploading ? "Finishing photo…" : "Create Account"}
      </SubmitButton>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-700"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4 bg-slate-900 text-slate-500">
            Or sign up with
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => handleOAuthDefault("google")}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700 text-slate-200 font-medium transition-all"
        >
          <Chrome className="h-5 w-5" />
          Google
        </button>
        <button
          type="button"
          onClick={() => handleOAuthDefault("apple")}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700 text-slate-200 font-medium transition-all"
        >
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
          </svg>
          Apple
        </button>
      </div>
    </form>
  );
};
