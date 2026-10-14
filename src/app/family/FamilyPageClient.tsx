"use client";

import * as React from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent } from "@/components/design-system/Card";
import { Button } from "@/components/design-system/Button";
import { Avatar } from "@/components/design-system/Avatar";
import { Badge } from "@/components/design-system/Badge";
import { trpc } from "@/lib/trpc/client";
import { useToast } from "@/components/design-system/Toaster";
import {
  Users,
  UserPlus,
  Mail,
  MapPin,
  Siren,
  Check,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Leaflet map must be client-only (it references `window`).
const FamilyMap = dynamic(() => import("@/components/family/FamilyMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[400px] w-full rounded-xl bg-muted animate-pulse flex items-center justify-center text-sm text-muted-foreground">
      Loading map...
    </div>
  ),
});

type Tab = "members" | "requests" | "posts" | "map";

const TABS: { key: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "members", label: "Members", icon: Users },
  { key: "requests", label: "Requests", icon: Mail },
  { key: "posts", label: "Posts", icon: Users },
  { key: "map", label: "Map", icon: MapPin },
];

export const FamilyPageClient: React.FC = () => {
  const [tab, setTab] = React.useState<Tab>("members");
  const toast = useToast();
  const utils = trpc.useUtils();

  const membersQuery = trpc.family.listMembers.useQuery({}, {
    enabled: tab === "members" || tab === "map",
  });
  const requestsQuery = trpc.family.listPendingRequests.useQuery(undefined, {
    enabled: tab === "requests",
  });
  const familyFeed = trpc.feed.getFamily.useInfiniteQuery(
    { limit: 20 },
    {
      enabled: tab === "posts",
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    },
  );
  const locationsQuery = trpc.family.listFamilyLocations.useQuery(undefined, {
    enabled: tab === "map",
  });

  const sendRequest = trpc.family.sendRequest.useMutation();
  const respondRequest = trpc.family.respondRequest.useMutation();
  const cancelRequest = trpc.family.cancelRequest.useMutation();
  const toggleShare = trpc.family.toggleShareLocation.useMutation();
  const sos = trpc.family.sos.useMutation();

  const invalidateAll = () => {
    utils.family.listMembers.invalidate();
    utils.family.listPendingRequests.invalidate();
    utils.family.listFamilyLocations.invalidate();
  };

  const [addUsername, setAddUsername] = React.useState("");
  const usersSearch = trpc.search.query.useQuery(
    { q: addUsername, type: "user", limit: 5 },
    { enabled: addUsername.length >= 2, staleTime: 5000 },
  );

  const handleSend = async (userId: string) => {
    try {
      await sendRequest.mutateAsync({ targetUserId: userId });
      toast.show("Family request sent!", "success");
      setAddUsername("");
      invalidateAll();
    } catch (e: any) {
      toast.show(e?.message || "Failed to send request", "danger");
    }
  };

  const handleRespond = async (otherUserId: string, action: "approve" | "reject") => {
    try {
      await respondRequest.mutateAsync({ otherUserId, action });
      toast.show(action === "approve" ? "Family request accepted!" : "Request declined.", "success");
      invalidateAll();
    } catch (e: any) {
      toast.show(e?.message || "Action failed", "danger");
    }
  };

  const handleCancel = async (targetUserId: string) => {
    try {
      await cancelRequest.mutateAsync({ targetUserId });
      toast.show("Request cancelled.", "success");
      invalidateAll();
    } catch (e: any) {
      toast.show(e?.message || "Failed to cancel", "danger");
    }
  };

  const handleToggleShare = async (targetUserId: string, enabled: boolean) => {
    try {
      await toggleShare.mutateAsync({ targetUserId, direction: "meToThem", enabled });
      toast.show(enabled ? "Location sharing enabled." : "Location sharing disabled.", "success");
      invalidateAll();
    } catch (e: any) {
      toast.show(e?.message || "Failed to update", "danger");
    }
  };

  const handleSos = async () => {
    if (!confirm("Send an SOS alert to your family members?")) return;
    try {
      const res = await sos.mutateAsync({});
      toast.show(`SOS alert sent to ${res.notified} family member(s)!`, "danger");
    } catch (e: any) {
      toast.show(e?.message || "Failed to send SOS", "danger");
    }
  };

  const posts = familyFeed.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <AppShell requireAuth={true}>
      <div className="mx-auto w-full max-w-2xl px-4 pb-28 pt-4">
        <header className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              Family
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Stay connected with your loved ones.
            </p>
          </div>
          <Button
            variant="danger"
            size="sm"
            onClick={handleSos}
            disabled={sos.isPending}
            className="gap-1.5"
          >
            <Siren className="h-4 w-4" />
            SOS
          </Button>
        </header>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 rounded-xl bg-muted p-1">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                  tab === t.key
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Add family member */}
        {tab === "members" && (
          <div className="mb-4">
            <label className="text-sm font-semibold mb-2 block">Add family member</label>
            <div className="relative">
              <input
                type="text"
                value={addUsername}
                onChange={(e) => setAddUsername(e.target.value)}
                placeholder="Search by username or name..."
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              {addUsername.length >= 2 && usersSearch.data?.users && usersSearch.data.users.length > 0 && (
                <div className="absolute z-20 mt-1 w-full rounded-lg border border-border bg-background shadow-lg overflow-hidden">
                  {usersSearch.data.users.map((u: any) => (
                    <div
                      key={u.id}
                      className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer"
                      onClick={() => handleSend(u.id)}
                    >
                      <Avatar avatarUrl={u.avatarUrl} displayName={u.displayName} username={u.username} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{u.displayName || u.username}</p>
                        <p className="text-xs text-muted-foreground">@{u.username}</p>
                      </div>
                      <UserPlus className="h-4 w-4 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Members tab */}
        {tab === "members" && (
          <div className="space-y-3">
            {membersQuery.isLoading ? (
              [0, 1, 2].map((i) => (
                <div key={i} className="rounded-card border border-border p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-32 rounded-md bg-muted animate-pulse" />
                      <div className="h-3 w-20 rounded-md bg-muted animate-pulse" />
                    </div>
                  </div>
                </div>
              ))
            ) : membersQuery.data?.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-sm font-medium">No family members yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Search above to add family members and start sharing.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Family Members
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    {membersQuery.data?.length} member{membersQuery.data?.length !== 1 ? "s" : ""}
                  </span>
                </div>
                {membersQuery.data?.map((m) => (
                  <Card key={m.relationshipId}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Link href={`/profile/${m.member.username}`}>
                          <Avatar
                            avatarUrl={m.member.avatarUrl}
                            displayName={m.member.displayName}
                            username={m.member.username}
                            size="md"
                          />
                        </Link>
                        <div className="flex-1 min-w-0">
                          <Link href={`/profile/${m.member.username}`}>
                            <p className="text-sm font-medium truncate hover:underline">
                              {m.member.displayName || m.member.username}
                            </p>
                          </Link>
                          <p className="text-xs text-muted-foreground">@{m.member.username}</p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-xs text-muted-foreground">Location sharing</span>
                            <span
                              className={cn(
                                "text-xs font-medium",
                                m.shareMyLocationToThem ? "text-success" : "text-muted-foreground"
                              )}
                            >
                              {m.shareMyLocationToThem ? "On" : "Off"}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={m.shareMyLocationToThem}
                          onClick={() => handleToggleShare(m.member.id, !m.shareMyLocationToThem)}
                          className={cn(
                            "relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2",
                            m.shareMyLocationToThem ? "bg-success" : "bg-muted"
                          )}
                          title={m.shareMyLocationToThem ? "Sharing location with them" : "Not sharing location"}
                        >
                          <span
                            className={cn(
                              "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200",
                              m.shareMyLocationToThem ? "translate-x-6" : "translate-x-1"
                            )}
                          />
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Requests tab */}
        {tab === "requests" && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold mb-2">Incoming requests</h3>
              {requestsQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : requestsQuery.data?.incoming.length === 0 ? (
                <p className="text-sm text-muted-foreground">No pending requests.</p>
              ) : (
                <div className="space-y-2">
                  {requestsQuery.data?.incoming.map((r) => (
                    <Card key={r.relationshipId}>
                      <CardContent className="p-3 flex items-center gap-3">
                        <Avatar
                          avatarUrl={r.requester.avatarUrl}
                          displayName={r.requester.displayName}
                          username={r.requester.username}
                          size="sm"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {r.requester.displayName || r.requester.username}
                          </p>
                          <p className="text-xs text-muted-foreground">wants to add you as family</p>
                        </div>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleRespond(r.requester.id, "approve")}
                          className="gap-1"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRespond(r.requester.id, "reject")}
                          className="gap-1 text-muted-foreground"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-2">Sent requests</h3>
              {requestsQuery.data?.outgoing.length === 0 ? (
                <p className="text-sm text-muted-foreground">No sent requests.</p>
              ) : (
                <div className="space-y-2">
                  {requestsQuery.data?.outgoing.map((r) => (
                    <Card key={r.relationshipId}>
                      <CardContent className="p-3 flex items-center gap-3">
                        <Avatar
                          avatarUrl={r.target.avatarUrl}
                          displayName={r.target.displayName}
                          username={r.target.username}
                          size="sm"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {r.target.displayName || r.target.username}
                          </p>
                          <Badge variant="info" size="sm">
                            Pending
                          </Badge>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCancel(r.target.id)}
                          className="text-xs text-muted-foreground"
                        >
                          Cancel
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Posts tab */}
        {tab === "posts" && (
          <div className="space-y-3">
            {familyFeed.isLoading ? (
              [0, 1, 2].map((i) => (
                <div key={i} className="rounded-card border border-border p-4 space-y-2">
                  <div className="h-4 w-full rounded-md bg-muted animate-pulse" />
                  <div className="h-4 w-2/3 rounded-md bg-muted animate-pulse" />
                </div>
              ))
            ) : posts.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-sm font-medium">No family posts yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Family posts are only visible to approved family members.
                  </p>
                </CardContent>
              </Card>
            ) : (
              posts.map((p: any) => (
                <Link key={p.id} href={`/post/${p.slug}`}>
                  <Card className="hover:bg-accent/40 transition-colors cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <span className="font-medium text-foreground">
                          {p.creator?.displayName || p.creator?.username || "Anonymous"}
                        </span>
                      </div>
                      <p className="text-sm font-medium line-clamp-3">{p.question}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))
            )}
            {familyFeed.hasNextPage && (
              <div className="flex justify-center pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => familyFeed.fetchNextPage()}
                  disabled={familyFeed.isFetchingNextPage}
                >
                  {familyFeed.isFetchingNextPage ? "Loading..." : "Load more"}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Map tab */}
        {tab === "map" && (
          <div className="space-y-3">
            {locationsQuery.data && locationsQuery.data.length > 0 ? (
              <FamilyMap locations={locationsQuery.data} />
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <MapPin className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-sm font-medium">No family locations available</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Family members who share their location with you will appear here.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
};
