"use client";

import * as React from "react";
import { AppShell } from "@/components/layout/AppShell";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/design-system/Tabs";
import { Feed, FeedType } from "@/components/feed/Feed";
import { useRouter } from "next/navigation";

export function FeedPageClient() {
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState<FeedType>("forYou");

  const handlePostClick = (post: any) => {
    router.push(`/post/${post.id}`);
  };

  return (
    <AppShell requireAuth={false}>
      <div>
        <div className="px-4 pt-4 md:px-6 md:pt-6 pb-2 border-b border-border bg-card/50 backdrop-blur-md sticky top-16 md:top-16 z-10">
          <div className="max-w-[640px] lg:max-w-[720px] xl:max-w-[760px] mx-auto">
            <h1 className="text-2xl font-bold tracking-tight mb-4">
              {activeTab === "forYou" ? "For You" : "Following"}
            </h1>

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as FeedType)}>
              <TabsList className="w-full">
                <TabsTrigger value="forYou" className="flex-1">
                  For You
                </TabsTrigger>
                <TabsTrigger value="following" className="flex-1">
                  Following
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={() => {}}>
          <TabsContent value="forYou" className="mt-0">
            <Feed
              feedType="forYou"
              onPostClick={handlePostClick}
              showEndCard={true}
            />
          </TabsContent>

          <TabsContent value="following" className="mt-0">
            <Feed
              feedType="following"
              onPostClick={handlePostClick}
              showEndCard={true}
            />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
