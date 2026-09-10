"use client";

import * as React from "react";
import { useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/design-system/Modal";
import { LoginForm } from "./forms/LoginForm";
import { RegisterForm } from "./forms/RegisterForm";
import { cn } from "@/lib/utils";

export type ReturnIntent =
  | { type: "vote"; postId: string; optionId?: string; ratingValue?: number; emojiValue?: string; priceValue?: number }
  | { type: "comment"; postId?: string }
  | { type: "follow"; userId?: string }
  | { type: "create_post" }
  | null;

interface LoginModalContextValue {
  openLogin: (intent?: ReturnIntent) => void;
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

  const openLogin = React.useCallback((intent?: ReturnIntent) => {
    if (intent) setReturnIntent(intent);
    setActiveTab("login");
    setIsOpen(true);
  }, []);

  const closeLogin = React.useCallback(() => {
    setIsOpen(false);
    setReturnIntent(null);
  }, []);

  const handleOAuthClick = async (provider: string) => {
    const callbackUrl = returnIntent?.type ? "/feed" : "/feed";
    await signIn(provider, { callbackUrl });
  };

  const handleLoginSuccess = () => {
    setIsOpen(false);
    router.refresh();
  };

  const handleRegisterSuccess = () => {
    setIsOpen(false);
    router.refresh();
  };

  const value = React.useMemo(
    () => ({ openLogin, closeLogin, returnIntent, setReturnIntent }),
    [openLogin, closeLogin, returnIntent]
  );

  return (
    <LoginModalContext.Provider value={value}>
      {children}
      <Modal
        open={isOpen && !session}
        onClose={closeLogin}
        size="md"
        showCloseButton={true}
      >
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <div className="text-3xl font-black bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
              WHATDO
            </div>
            <p className="text-sm text-muted-foreground">
              {returnIntent?.type === "vote"
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
