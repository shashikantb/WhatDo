"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface SelectProps {
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  label?: string;
  helperText?: string;
  className?: string;
  searchable?: boolean;
}

export const Select: React.FC<SelectProps> = ({
  options,
  value,
  onChange,
  placeholder = "Select an option",
  disabled = false,
  error = false,
  label,
  helperText,
  className,
}) => {
  const selectId = React.useId();
  const selectedOption = options.find((o) => o.value === value);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label
          htmlFor={selectId}
          className="text-sm font-medium text-foreground"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          value={value ?? ""}
          onChange={(e) => onChange?.(e.target.value)}
          disabled={disabled}
          className={cn(
            "flex h-10 w-full appearance-none rounded-lg border bg-background px-3 pr-10 text-sm text-foreground",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "transition-colors duration-200",
            error
              ? "border-danger focus:ring-danger/30"
              : "border-border",
            !selectedOption && "text-muted-foreground",
            className
          )}
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      </div>
      {helperText && (
        <p
          className={cn(
            "text-xs",
            error ? "text-danger" : "text-muted-foreground"
          )}
        >
          {helperText}
        </p>
      )}
    </div>
  );
};
