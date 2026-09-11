"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type TextareaVariant = "default" | "error";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  variant?: TextareaVariant;
  label?: string;
  helperText?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      variant = "default",
      label,
      helperText,
      id,
      rows = 4,
      ...props
    },
    ref
  ) => {
    const autoId = React.useId();
    const inputId = id ?? autoId;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-foreground"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          rows={rows}
          className={cn(
            "flex w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground placeholder:text-slate-400",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "transition-colors duration-200 resize-y min-h-[80px]",
            variant === "error"
              ? "border-danger focus:ring-danger/30"
              : "border-border",
            className
          )}
          {...props}
        />
        {helperText && (
          <p
            className={cn(
              "text-xs",
              variant === "error" ? "text-danger" : "text-muted-foreground"
            )}
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
