"use client";

import * as React from "react";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/shared/EmptyState";
import { Bookmark, Compass } from "lucide-react";
import { useRouter } from "next/navigation";
import { Feed } from "@/components/feed/Feed";

export default function SavedPage() {
  const router = useRouter();

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto">
        <div className="px-4 pt-4 md:px-6 md:pt-6 pb-4 md:pb-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-accent/15 border border-accent/20 flex items-center justify-center">
              <Bookmark className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Saved Posts</h1>
              <p className="text-sm text-muted-foreground">
                Opinions you&apos;ve bookmarked to revisit later
              </p>
            </div>
          </div>

          <Feed
            feedType="saved"
            showEndCard={false}
            className="space-y-3"
          />
        </div>
      </div>
    </AppShell>
  );
}
