"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/design-system/Modal";
import { CreatePostFlow } from "./CreatePostFlow";
import { MessageCircleQuestion } from "lucide-react";

export interface AskButtonProps {
  onClick?: () => void;
  className?: string;
  showAsModal?: boolean;
}

export const AskButton: React.FC<AskButtonProps> = ({
  onClick,
  className,
  showAsModal = true,
}) => {
  const router = useRouter();
  const { data: session } = useSession();
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  const handleClick = () => {
    if (!session?.user?.id) {
      router.push("/login");
      return;
    }
    if (onClick) {
      onClick();
      return;
    }
    if (showAsModal) {
      setIsModalOpen(true);
    } else {
      router.push("/ask");
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        className={cn(
          "fixed z-50 flex items-center gap-2 font-semibold text-white shadow-xl",
          "rounded-full px-5 py-3 text-sm transition-all duration-200",
          "bg-gradient-to-r from-primary via-primary to-accent",
          "hover:shadow-2xl hover:scale-105 active:scale-95",
          "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background",
          "md:bottom-6 md:right-6 md:px-6 md:py-4 md:text-base",
          "hidden md:flex animate-pulse-subtle",
          className
        )}
        aria-label="Ask people"
      >
        <span className="relative flex h-5 w-5 md:h-6 md:w-6">
          <span className="absolute inset-0 rounded-full bg-white/20 animate-ping opacity-75" />
          <Plus className="relative h-5 w-5 md:h-6 md:w-6" strokeWidth={2.5} />
        </span>
        <span className="whitespace-nowrap tracking-tight">ASK PEOPLE</span>
      </button>

      {showAsModal && (
        <Modal
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Create New Post"
          description="Ask a question, share a poll, or get opinions from the community."
          size="xl"
          preventCloseOnBackdrop={false}
        >
          <div className="-mx-2 px-2">
            <div className="mb-2 flex items-center gap-2 px-1">
              <div className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center">
                <MessageCircleQuestion className="h-4 w-4 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground">
                Your draft will auto-save locally as you type.
              </p>
            </div>
            <CreatePostFlow
              onPublished={() => {
                setIsModalOpen(false);
              }}
            />
          </div>
        </Modal>
      )}
    </>
  );
};
