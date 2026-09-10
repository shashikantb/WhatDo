"use client";

import * as React from "react";
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastVariant = "default" | "success" | "danger" | "warning" | "info";

export interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
  duration: number;
}

interface ToastProps {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}

const variantStyles: Record<
  ToastVariant,
  { bg: string; border: string; icon: React.ReactNode; iconColor: string }
> = {
  default: {
    bg: "bg-card",
    border: "border-border",
    icon: <Info className="h-5 w-5" />,
    iconColor: "text-muted-foreground",
  },
  success: {
    bg: "bg-card",
    border: "border-success/30",
    icon: <CheckCircle2 className="h-5 w-5" />,
    iconColor: "text-success",
  },
  danger: {
    bg: "bg-card",
    border: "border-danger/30",
    icon: <AlertCircle className="h-5 w-5" />,
    iconColor: "text-danger",
  },
  warning: {
    bg: "bg-card",
    border: "border-warning/30",
    icon: <AlertTriangle className="h-5 w-5" />,
    iconColor: "text-warning",
  },
  info: {
    bg: "bg-card",
    border: "border-primary/30",
    icon: <Info className="h-5 w-5" />,
    iconColor: "text-primary",
  },
};

export const Toast: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  const { id, message, variant, duration } = toast;
  const styles = variantStyles[variant];
  const [isExiting, setIsExiting] = React.useState(false);
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    const frame = requestAnimationFrame(() => setIsVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onDismiss(id), 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onDismiss]);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => onDismiss(id), 300);
  };

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border shadow-popover p-4 min-w-[280px] max-w-sm",
        styles.bg,
        styles.border,
        "transition-all duration-300 ease-out",
        isVisible && !isExiting
          ? "opacity-100 translate-x-0"
          : "opacity-0 translate-x-8"
      )}
      role="alert"
    >
      <div className={cn("flex-shrink-0 mt-0.5", styles.iconColor)}>
        {styles.icon}
      </div>
      <div className="flex-1 text-sm text-foreground break-words">
        {message}
      </div>
      <button
        onClick={handleDismiss}
        className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors rounded p-0.5 -mr-1 -mt-1"
        aria-label="Dismiss toast"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};
