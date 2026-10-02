"use client";

import * as React from "react";
import { useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/design-system/Modal";
import { LoginForm } from "./forms/LoginForm";
import { RegisterForm } from "./forms/RegisterForm";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { useToast } from "@/components/design-system/Toaster";

export type ReturnIntent =
  | { type: "vote"; postId: string; optionId?: string; ratingValue?: number; emojiValue?: string; priceValue?: number }
  | { type: "comment"; postId?: string }
  | { type: "follow"; userId?: string }
  | { type: "create_post" }
  | { type: "whatdo_reveal"; sessionId: string; minQuestions: number }
  | null;

interface LoginModalContextValue {
  openLogin: (intent?: ReturnIntent, tab?: "login" | "register") => void;
  closeLogin: () => void;
  returnIntent: ReturnIntent;
  setReturnIntent: (intent: ReturnIntent) => void;
}

const LoginModalContext = React.createContext<LoginModalContextValue | null>(null);

export function useLoginModal(): LoginModalContextValue {
  const context = React.useContext(LoginModalContext);
  if (!context) {
    throw new Error("useLoginModal must be used within LoginModalProvider");
  }
  return context;
}

export interface LoginModalProviderProps {
  children: React.ReactNode;
}

export const LoginModalProvider: React.FC<LoginModalProviderProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [returnIntent, setReturnIntent] = useState<ReturnIntent>(null);
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const { data: session } = useSession();
  const router = useRouter();
  const revealAfter = trpc.whatdo.revealAfterLogin.useMutation();
  const calc = trpc.whatdo.calculateResult.useMutation();
  const toast = useToast();

  const openLogin = React.useCallback((intent?: ReturnIntent, tab?: "login" | "register") => {
    if (intent) setReturnIntent(intent);
    setActiveTab(tab ?? (intent?.type === "whatdo_reveal" ? "register" : "login"));
    setIsOpen(true);
  }, []);

  const closeLogin = React.useCallback(() => {
    setIsOpen(false);
    setReturnIntent(null);
  }, []);

  const handleOAuthClick = async (provider: string) => {
    const callbackUrl = returnIntent?.type === "whatdo_reveal"
      ? "/whatdo/result"
      : returnIntent?.type ? "/feed" : "/feed";
    await signIn(provider, { callbackUrl });
  };

  const handleRevealMerge = async (intent: Exclude<ReturnIntent, null> & { type: "whatdo_reveal" }) => {
    try {
      const r = await calc.mutateAsync({
        sessionId: intent.sessionId,
        minQuestions: intent.minQuestions,
      });
      await revealAfter.mutateAsync({ sessionId: intent.sessionId }).catch(() => {});
      if (r?.identityId) {
        try { window.sessionStorage.setItem("whatdo_last_identity", r.identityId); } catch {}
      }
      const dest = new URLSearchParams();
      if (r?.identityId) dest.set("id", r.identityId);
      router.push(dest.toString() ? `/whatdo/result?${dest.toString()}` : "/whatdo/result");
      toast.show("Your WhatDo Type is ready 🎉", "success", 3200);
      return true;
    } catch (e: any) {
      toast.show(e?.message || "Almost there — go to /whatdo/result to see your type.", "info");
      router.push("/whatdo/result");
      return false;
    }
  };

  const handleLoginSuccess = () => {
    const intent = returnIntent;
    setIsOpen(false);
    router.refresh();
    if (intent?.type === "whatdo_reveal") {
      setTimeout(() => void handleRevealMerge(intent), 400);
    }
  };

  const handleRegisterSuccess = () => {
    const intent = returnIntent;
    setIsOpen(false);
    router.refresh();
    if (intent?.type === "whatdo_reveal") {
      setTimeout(() => void handleRevealMerge(intent), 400);
    }
  };

  const value = React.useMemo(
    () => ({ openLogin, closeLogin, returnIntent, setReturnIntent }),
    [openLogin, closeLogin, returnIntent]
  );

  const whatdoHint = React.useMemo(() => {
    if (returnIntent?.type !== "whatdo_reveal") return null;
    return {
      title: "Create account to reveal your WhatDo Type",
      subtitle: "Add a profile photo now and it will appear on your share cards.",
    };
  }, [returnIntent]);

  return (
    <LoginModalContext.Provider value={value}>
      {children}
      <Modal
        open={isOpen && !session}
        onClose={closeLogin}
        size="md"
        showCloseButton={true}
      >
        <div className="space-y-5">
          <div className="text-center space-y-2">
            <div className="text-3xl font-black bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
              WHATDO
            </div>
            <p className="text-sm text-muted-foreground">
              {whatdoHint ? (
                <span className="block space-y-1">
                  <span className="block text-base font-black text-white">{whatdoHint.title}</span>
                  <span className="block text-[12px] text-fuchsia-200/90">{whatdoHint.subtitle}</span>
                </span>
              ) : returnIntent?.type === "vote"
                ? "Sign in to cast your vote"
                : returnIntent?.type === "comment"
                ? "Sign in to join the conversation"
                : returnIntent?.type === "follow"
                ? "Sign in to follow creators"
                : returnIntent?.type === "create_post"
                ? "Sign in to create a post"
                : "Sign in to see it. Vote it. Know what people think."}
            </p>
          </div>

          <div className="flex gap-2 bg-slate-800/50 rounded-xl p-1">
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

          <div className="max-h-[60vh] overflow-y-auto pr-1 -mr-1 scrollbar-thin">
            {activeTab === "login" ? (
              <LoginForm
                onOAuthClick={handleOAuthClick}
                onSuccess={handleLoginSuccess}
                isModal={true}
              />
            ) : (
              <RegisterForm
                onOAuthClick={handleOAuthClick}
                onSuccess={handleRegisterSuccess}
                isModal={true}
                postRegisterRedirect={
                  returnIntent?.type === "whatdo_reveal" ? "/whatdo/result" : undefined
                }
              />
            )}
          </div>

          <p className="text-center text-xs text-slate-500">
            By continuing you agree to our Terms and Privacy Policy
          </p>
        </div>
      </Modal>
    </LoginModalContext.Provider>
  );
};
