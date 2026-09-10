"use client";

import * as React from "react";
import {
  Share2,
  Copy,
  Mail,
  X,
  MessageCircle,
  Facebook,
  Linkedin,
  Send,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/design-system/Toaster";

export interface ShareMenuProps {
  title: string;
  text?: string;
  url: string;
  children?: React.ReactNode;
  className?: string;
}

interface ShareOption {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  onClick: () => void;
}

export const ShareMenu: React.FC<ShareMenuProps> = ({
  title,
  text = "",
  url,
  children,
  className,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const { show } = useToast();

  const encodedTitle = encodeURIComponent(title);
  const encodedText = encodeURIComponent(text || title);
  const encodedUrl = encodeURIComponent(url);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      show("Link copied to clipboard!", "success");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      show("Failed to copy link", "danger");
    }
  };

  const openUrl = (shareUrl: string) => {
    window.open(shareUrl, "_blank", "noopener,noreferrer");
  };

  const shareOptions: ShareOption[] = [
    {
      name: "WhatsApp",
      icon: MessageCircle,
      color: "text-green-500 hover:bg-green-500/10",
      onClick: () =>
        openUrl(`https://wa.me/?text=${encodedText}%20${encodedUrl}`),
    },
    {
      name: "X / Twitter",
      icon: X,
      color: "text-foreground hover:bg-muted",
      onClick: () =>
        openUrl(
          `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`
        ),
    },
    {
      name: "Facebook",
      icon: Facebook,
      color: "text-blue-600 hover:bg-blue-500/10",
      onClick: () =>
        openUrl(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`),
    },
    {
      name: "LinkedIn",
      icon: Linkedin,
      color: "text-blue-700 hover:bg-blue-600/10",
      onClick: () =>
        openUrl(
          `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`
        ),
    },
    {
      name: "Telegram",
      icon: Send,
      color: "text-sky-500 hover:bg-sky-500/10",
      onClick: () =>
        openUrl(
          `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`
        ),
    },
    {
      name: "Email",
      icon: Mail,
      color: "text-muted-foreground hover:bg-muted",
      onClick: () =>
        openUrl(
          `mailto:?subject=${encodedTitle}&body=${encodedText}%0A%0A${encodedUrl}`
        ),
    },
  ];

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: text || title,
          url,
        });
      } catch {
      }
    }
  };

  const handleToggle = () => {
    if (navigator.share && !isOpen) {
      handleNativeShare();
    } else {
      setIsOpen((prev) => !prev);
    }
  };

  return (
    <div ref={menuRef} className={cn("relative inline-block", className)}>
      {children ? (
        <div onClick={handleToggle}>{children}</div>
      ) : (
        <button
          type="button"
          onClick={handleToggle}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label="Share"
        >
          <Share2 className="h-5 w-5" />
        </button>
      )}

      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 z-50 w-56 rounded-lg border border-border bg-card shadow-popover animate-scaleIn"
          role="menu"
        >
          <div className="p-1.5">
            {shareOptions.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.name}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    option.onClick();
                    setIsOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                    option.color
                  )}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span className="font-medium">{option.name}</span>
                </button>
              );
            })}
          </div>
          <div className="border-t border-border p-1.5">
            <button
              type="button"
              role="menuitem"
              onClick={copyToClipboard}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
            >
              {copied ? (
                <Check className="h-4 w-4 flex-shrink-0 text-success" />
              ) : (
                <Copy className="h-4 w-4 flex-shrink-0" />
              )}
              <span className="font-medium">
                {copied ? "Copied!" : "Copy Link"}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
