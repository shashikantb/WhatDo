"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/design-system/Button";

export interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  actionButton?: {
    label: string;
    onClick: () => void;
    variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  };
  secondaryButton?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionButton,
  secondaryButton,
  className,
}) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-12 px-6",
        className
      )}
    >
      {Icon && (
        <div className="mb-4 p-4 rounded-2xl bg-muted border border-border">
          <Icon className="h-10 w-10 text-muted-foreground" />
        </div>
      )}
      <h3 className="text-xl font-semibold tracking-tight mb-2">{title}</h3>
      {description && (
        <p className="text-muted-foreground text-sm max-w-md mb-6">
          {description}
        </p>
      )}
      {(actionButton || secondaryButton) && (
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {actionButton && (
            <Button variant={actionButton.variant ?? "primary"} onClick={actionButton.onClick}>
              {actionButton.label}
            </Button>
          )}
          {secondaryButton && (
            <Button variant="ghost" onClick={secondaryButton.onClick}>
              {secondaryButton.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
