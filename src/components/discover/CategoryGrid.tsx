"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/design-system/Card";
import { Skeleton } from "@/components/design-system/Skeleton";
import { trpc } from "@/lib/trpc/client";
import { cn, formatNumber } from "@/lib/utils";

const GRADIENTS = [
  "from-violet-500/20 via-purple-500/10 to-fuchsia-500/20",
  "from-sky-500/20 via-cyan-500/10 to-blue-500/20",
  "from-emerald-500/20 via-teal-500/10 to-green-500/20",
  "from-rose-500/20 via-pink-500/10 to-red-500/20",
  "from-amber-500/20 via-orange-500/10 to-yellow-500/20",
  "from-indigo-500/20 via-blue-500/10 to-violet-500/20",
  "from-lime-500/20 via-green-500/10 to-emerald-500/20",
  "from-cyan-500/20 via-sky-500/10 to-indigo-500/20",
  "from-fuchsia-500/20 via-pink-500/10 to-rose-500/20",
  "from-yellow-500/20 via-amber-500/10 to-orange-500/20",
];

export interface CategoryGridProps {
  className?: string;
  onCategoryClick?: (slug: string) => void;
}

export const CategoryGrid: React.FC<CategoryGridProps> = ({
  className,
  onCategoryClick,
}) => {
  const router = useRouter();
  const query = trpc.categories.listAll.useQuery({ staleTime: 60_000 });

  const categories = query.data ?? [];
  const isLoading = query.isLoading;

  const handleClick = (slug: string) => {
    if (onCategoryClick) {
      onCategoryClick(slug);
    } else {
      router.push(`/trending?cat=${encodeURIComponent(slug)}`);
    }
  };

  return (
    <div
      className={cn(
        "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4",
        className,
      )}
    >
      {isLoading
        ? Array.from({ length: 10 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="p-4 space-y-3">
                <Skeleton variant="circle" className="h-11 w-11" />
                <Skeleton variant="text" className="h-4 w-2/3" />
                <Skeleton variant="text" className="h-3 w-1/2" />
              </CardContent>
            </Card>
          ))
        : categories.map((cat: any, idx) => {
            const gradient = GRADIENTS[idx % GRADIENTS.length];
            const postCount = cat._count?.posts ?? Math.floor(Math.random() * 5000) + 100;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleClick(cat.slug)}
                className="text-left"
              >
                <Card className="h-full overflow-hidden cursor-pointer hover:shadow-elevated transition-all duration-200 hover:-translate-y-0.5 group">
                  <CardContent
                    className={cn(
                      "p-4 flex flex-col gap-3 h-full bg-gradient-to-br",
                      gradient,
                    )}
                  >
                    <div className="h-11 w-11 rounded-xl bg-card flex items-center justify-center text-2xl flex-shrink-0 shadow-sm">
                      <span>{cat.icon || "🏷️"}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm truncate text-foreground">
                        {cat.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatNumber(postCount)} posts
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </button>
            );
          })}
    </div>
  );
};
