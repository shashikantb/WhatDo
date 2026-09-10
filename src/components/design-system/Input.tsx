"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type InputVariant = "default" | "error";
type InputSize = "sm" | "md" | "lg";

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  variant?: InputVariant;
  size?: InputSize;
  label?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isFile?: boolean;
}

const sizeClasses: Record<InputSize, string> = {
  sm: "h-8 px-2.5 text-xs",
  md: "h-10 px-3 text-sm",
  lg: "h-12 px-4 text-base",
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      variant = "default",
      size = "md",
      label,
      helperText,
      leftIcon,
      rightIcon,
      isFile,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id ?? React.useId();

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
        <div className="relative">
          {leftIcon && (
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              "flex w-full rounded-lg border bg-background text-foreground placeholder:text-slate-400",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "transition-colors duration-200",
              sizeClasses[size],
              variant === "error"
                ? "border-danger focus:ring-danger/30"
                : "border-border",
              leftIcon && "pl-9",
              rightIcon && "pr-9",
              isFile &&
                "file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:bg-muted file:text-sm file:font-medium file:text-foreground file:cursor-pointer hover:file:bg-muted/80",
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {rightIcon}
            </div>
          )}
        </div>
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

Input.displayName = "Input";
