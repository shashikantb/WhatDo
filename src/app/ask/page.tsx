"use client";

import * as React from "react";
import { AppShell } from "@/components/layout/AppShell";
import { CreatePostFlow } from "@/components/post-creator/CreatePostFlow";
import { MessageCircleQuestion } from "lucide-react";

export default function AskPage() {
  return (
    <AppShell requireAuth={true}>
      <div className="max-w-7xl mx-auto w-full">
        <div className="px-4 pt-4 md:px-6 md:pt-6 pb-6 md:pb-10">
          <div className="mb-5 md:mb-6 flex items-center gap-3">
            <div className="h-11 w-11 md:h-12 md:w-12 rounded-2xl bg-gradient-to-br from-primary/15 to-accent/15 border border-primary/20 flex items-center justify-center">
              <MessageCircleQuestion className="h-5 w-5 md:h-6 md:w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                Create Post
              </h1>
              <p className="text-sm text-muted-foreground">
                Ask a question, share a poll, or start a discussion — your
                draft auto-saves locally.
              </p>
            </div>
          </div>

          <CreatePostFlow />
        </div>
      </div>
    </AppShell>
  );
}
