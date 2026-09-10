"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type ButtonSize = "sm" | "md" | "lg" | "xl" | "icon";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  asChild?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
  secondary:
    "bg-muted text-foreground hover:bg-muted/80 border border-border",
  ghost:
    "bg-transparent hover:bg-muted text-foreground",
  danger:
    "bg-danger text-white hover:bg-danger/90 shadow-sm",
  outline:
    "bg-transparent border border-border hover:bg-muted text-foreground",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 rounded-lg px-3 text-xs gap-1.5",
  md: "h-10 rounded-lg px-4 text-sm gap-2",
  lg: "h-12 rounded-xl px-6 text-base gap-2",
  xl: "h-14 rounded-xl px-8 text-lg gap-2",
  icon: "h-10 w-10 rounded-lg p-0",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      fullWidth,
      disabled,
      loading,
      leftIcon,
      rightIcon,
      children,
      type = "button",
      asChild,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    const classes = cn(
      "inline-flex items-center justify-center font-medium transition-all duration-200",
      "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background",
      "disabled:opacity-50 disabled:pointer-events-none",
      variantClasses[variant],
      sizeClasses[size],
      fullWidth && "w-full",
      className
    );

    const inner = (
      <>
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {!loading && leftIcon}
        {children}
        {!loading && rightIcon}
      </>
    );

    if (asChild && React.isValidElement(children)) {
      const onlyChild = React.Children.only(children) as React.ReactElement<any>;
      return React.cloneElement(onlyChild, {
        ref,
        className: cn(classes, (onlyChild.props as any).className),
        "aria-disabled": isDisabled,
        ...(isDisabled ? { disabled: true } : {}),
        ...props,
        children: (
          <>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {!loading && leftIcon}
            {(onlyChild.props as any).children}
            {!loading && rightIcon}
          </>
        ),
      });
    }

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        className={classes}
        {...props}
      >
        {inner}
      </button>
    );
  }
);

Button.displayName = "Button";
