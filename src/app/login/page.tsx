"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LoginForm } from "@/components/auth/forms/LoginForm";
import { RegisterForm } from "@/components/auth/forms/RegisterForm";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const router = useRouter();

  const handleSuccess = () => {
    router.push("/feed");
    router.refresh();
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-950">
      <div className="absolute inset-0 bg-gradient-to-br from-violet-900/40 via-slate-950 to-fuchsia-900/30"></div>
      <div className="absolute top-0 -left-40 w-96 h-96 bg-violet-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
      <div className="absolute bottom-0 -right-40 w-96 h-96 bg-fuchsia-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600 rounded-full mix-blend-multiply filter blur-3xl opacity-10"></div>

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link href="/" className="inline-block">
              <div className="text-4xl font-black bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
                WHATDO
              </div>
            </Link>
            <p className="mt-2 text-slate-400">
              See it. Vote it. Know what people think.
            </p>
          </div>

          <div className="bg-slate-900/70 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl">
            <div className="flex gap-2 mb-8 bg-slate-800/50 rounded-xl p-1">
              <button
                onClick={() => setActiveTab("login")}
                className={cn(
                  "flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-200",
                  activeTab === "login"
                    ? "bg-slate-700 text-white shadow-lg"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                Login
              </button>
              <button
                onClick={() => setActiveTab("register")}
                className={cn(
                  "flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-200",
                  activeTab === "register"
                    ? "bg-slate-700 text-white shadow-lg"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                Register
              </button>
            </div>

            {activeTab === "login" ? (
              <LoginForm onSuccess={handleSuccess} />
            ) : (
              <RegisterForm onSuccess={handleSuccess} />
            )}
          </div>

          <p className="mt-6 text-center text-sm text-slate-500">
            By continuing you agree to our{" "}
            <Link href="#" className="text-slate-400 hover:text-slate-200">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="#" className="text-slate-400 hover:text-slate-200">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
