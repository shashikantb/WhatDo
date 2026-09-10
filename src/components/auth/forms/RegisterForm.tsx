"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useFormState, useFormStatus } from "react-dom";
import { signIn } from "next-auth/react";
import {
  Mail,
  Lock,
  User,
  UserCircle,
  Eye,
  EyeOff,
  Chrome,
} from "lucide-react";
import { registerUser } from "@/lib/actions/auth.actions";
import { cn } from "@/lib/utils";

const registerFormSchema = z
  .object({
    username: z
      .string()
      .min(3, "Username must be at least 3 characters")
      .max(20, "Username must be at most 20 characters")
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

function SubmitButton({
  children,
  variant = "primary",
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary";
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
      disabled={pending}
      className={`${baseStyles} ${variants[variant]}`}
    >
      {pending && (
        <svg
          className="animate-spin h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
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
}

export const RegisterForm: React.FC<RegisterFormProps> = ({
  onOAuthClick,
  onSuccess,
  isModal = false,
  className,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [registerState, registerAction] = useFormState(registerUser, {
    success: false,
  });

  const {
    register,
    handleSubmit,
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

  const onSubmit = (data: RegisterFormValues) => {
    const formData = new FormData();
    formData.append("username", data.username);
    formData.append("displayName", data.displayName);
    formData.append("email", data.email);
    formData.append("password", data.password);
    formData.append("confirmPassword", data.confirmPassword);
    registerAction(formData);
  };

  if (registerState.success && onSuccess) {
    onSuccess();
  }

  const handleOAuthDefault = async (provider: string) => {
    if (onOAuthClick) {
      onOAuthClick(provider);
    } else {
      await signIn(provider, { callbackUrl: "/onboarding" });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={cn("space-y-4", className)}>
      {registerState.message && !registerState.success && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm">
          {registerState.message}
        </div>
      )}

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
          {errors.username && (
            <p className="mt-1.5 text-sm text-red-400">
              {registerState.issues?.username || errors.username.message}
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
          {errors.displayName && (
            <p className="mt-1.5 text-sm text-red-400">
              {errors.displayName.message}
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
        {errors.email && (
          <p className="mt-1.5 text-sm text-red-400">
            {registerState.issues?.email || errors.email.message}
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
          {errors.password && (
            <p className="mt-1.5 text-sm text-red-400">
              {errors.password.message}
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
          {errors.confirmPassword && (
            <p className="mt-1.5 text-sm text-red-400">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>
      </div>

      <SubmitButton>Create Account</SubmitButton>

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
