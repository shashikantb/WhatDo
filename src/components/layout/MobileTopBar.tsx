"use client";

import * as React from "react";
import Link from "next/link";
import { Bell, Users, Search, Siren } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { Badge } from "@/components/design-system/Badge";
import { useToast } from "@/components/design-system/Toaster";

export const MobileTopBar: React.FC = () => {
  const router = useRouter();
  const { status } = useSession();
  const isAuthed = status === "authenticated";
  const sessionSettled = status !== "loading";
  const toast = useToast();

  const { data: unreadCount } = trpc.notifications.unreadCount.useQuery(undefined, {
    enabled: sessionSettled && isAuthed,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    staleTime: 5000,
  });

  const sos = trpc.family.sos.useMutation({
    onSuccess: (data) => {
      toast.show(`SOS sent to ${data.notified} family member(s)!`, "danger");
    },
    onError: (err) => {
      if (err.message?.includes("No family members")) {
        toast.show("Add family members first to use SOS", "warning");
        router.push("/family");
      } else {
        toast.show(err.message || "Failed to send SOS", "danger");
      }
    },
  });

  const handleSOS = () => {
    if (!isAuthed) return;
    if (!window.confirm("Send an SOS alert with your current location to all family members?")) return;
    sos.mutate({});
  };

  return (
    <header className="md:hidden sticky top-0 z-30 h-14 flex items-center justify-between px-4 border-b border-border bg-card/80 backdrop-blur-md">
      <Link href="/" className="flex items-center gap-2">
        <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-sm">
          <span className="text-white font-bold text-sm">W</span>
        </div>
        <span className="font-bold text-base tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          WHATDO
        </span>
      </Link>

      <div className="flex items-center gap-1">
        <Link
          href="/search"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label="Search"
        >
          <Search className="h-5 w-5" />
        </Link>

        {isAuthed && (
          <>
            <button
              type="button"
              onClick={handleSOS}
              disabled={sos.isPending}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-danger hover:bg-danger/10 transition-colors"
              aria-label="Send SOS alert to family"
              title="SOS - Alert family with your location"
            >
              <Siren className="h-5 w-5" />
            </button>
            <Link
              href="/family"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="Family"
            >
              <Users className="h-5 w-5" />
            </Link>
            <Link
              href="/notifications"
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {unreadCount != null && unreadCount > 0 && (
                <Badge
                  variant="danger"
                  size="sm"
                  className="absolute -top-0.5 -right-0.5 min-w-[16px] justify-center px-1"
                >
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Badge>
              )}
            </Link>
          </>
        )}
      </div>
    </header>
  );
};

export default MobileTopBar;
