"use client";

import * as React from "react";
import {
  ThumbsUp,
  ListChecks,
  GitCompare,
  Star,
  Smile,
  BarChart3,
  Banknote,
  Scale,
  Target,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/design-system/Badge";

export type OpinionTypeValue =
  | "YES_NO"
  | "MULTIPLE_CHOICE"
  | "A_VS_B"
  | "RATING"
  | "EMOJI"
  | "POLL"
  | "PRICE"
  | "DECISION"
  | "PREDICTION";

export interface OpinionTypeDefinition {
  value: OpinionTypeValue;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const OPINION_TYPES: OpinionTypeDefinition[] = [
  {
    value: "YES_NO",
    label: "Yes / No",
    description: "Simple binary poll with two options",
    icon: ThumbsUp,
  },
  {
    value: "MULTIPLE_CHOICE",
    label: "Multiple Choice",
    description: "Choose one from many options",
    icon: ListChecks,
  },
  {
    value: "A_VS_B",
    label: "A vs B",
    description: "Compare two options head-to-head with images",
    icon: GitCompare,
  },
  {
    value: "RATING",
    label: "Rating",
    description: "Rate on a 1-10 numeric scale",
    icon: Star,
  },
  {
    value: "EMOJI",
    label: "Emoji Reaction",
    description: "React with emoji reactions",
    icon: Smile,
  },
  {
    value: "POLL",
    label: "Classic Poll",
    description: "Standard poll with custom coloured options",
    icon: BarChart3,
  },
  {
    value: "PRICE",
    label: "Price Guess",
    description: "Guess the price or budget range",
    icon: Banknote,
  },
  {
    value: "DECISION",
    label: "Decision",
    description: "Do it / Don't do it / Not sure",
    icon: Scale,
  },
  {
    value: "PREDICTION",
    label: "Prediction",
    description: "Predict a future Yes/No outcome",
    icon: Target,
  },
];

export interface OpinionTypePickerProps {
  value: OpinionTypeValue | null;
  onChange: (value: OpinionTypeValue) => void;
}

export const OpinionTypePicker: React.FC<OpinionTypePickerProps> = ({
  value,
  onChange,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
      {OPINION_TYPES.map((type) => {
        const Icon = type.icon;
        const selected = value === type.value;
        return (
          <button
            key={type.value}
            type="button"
            onClick={() => onChange(type.value)}
            className={cn(
              "group relative text-left p-4 md:p-5 rounded-2xl border-2 transition-all duration-200",
              "hover:-translate-y-0.5 hover:shadow-md",
              "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background",
              selected
                ? "border-primary bg-primary/5 shadow-md scale-[1.02]"
                : "border-border bg-card hover:border-primary/30"
            )}
          >
            <div className="flex flex-col gap-3">
              <div
                className={cn(
                  "flex items-center gap-3",
                  selected && "text-primary"
                )}
              >
                <div
                  className={cn(
                    "flex-shrink-0 h-12 w-12 rounded-xl flex items-center justify-center transition-colors",
                    selected
                      ? "bg-primary/15 text-primary"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <Icon className="h-6 w-6" strokeWidth={2} />
                </div>
                <div className="flex-1">
                  <h3
                    className={cn(
                      "font-semibold text-base leading-tight",
                      selected ? "text-primary" : "text-foreground"
                    )}
                  >
                    {type.label}
                  </h3>
                </div>
                {selected && (
                  <Badge variant="info" size="sm" className="flex-shrink-0">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Selected
                  </Badge>
                )}
              </div>
              <p
                className={cn(
                  "text-sm leading-snug",
                  selected ? "text-primary/80" : "text-muted-foreground"
                )}
              >
                {type.description}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
};
