"use client";

import * as React from "react";
import Link from "next/link";
import {
  Search,
  Users as UsersIcon,
  Shield,
  Crown,
  Ban,
  Undo2,
  CheckCircle2,
  Filter,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  MoreHorizontal,
  AlertTriangle,
  X,
  UserPlus,
  Eye,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { useToast } from "@/components/design-system/Toaster";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/design-system/Card";
import { Badge } from "@/components/design-system/Badge";
import { Button } from "@/components/design-system/Button";
import { Input } from "@/components/design-system/Input";
import { Select } from "@/components/design-system/Select";
import { Modal } from "@/components/design-system/Modal";
import { Textarea } from "@/components/design-system/Textarea";
import { Avatar } from "@/components/design-system/Avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/design-system/Tabs";
import { formatNumber, formatRelativeTime } from "@/lib/utils";
import { useSession } from "next-auth/react";

type UserStatusFilter = "ALL" | "VERIFIED" | "SUSPENDED" | "BANNED" | "ACTIVE";
type DateRangeFilter = "ALL" | "24H" | "7D" | "30D";

export default function AdminUsersPage() {
  const { data: session } = useSession();
  const { show } = useToast();
  const utils = trpc.useUtils();

  const [search, setSearch] = React.useState("");
  const [searchDebounced, setSearchDebounced] = React.useState("");
  const [status, setStatus] = React.useState<UserStatusFilter>("ALL");
  const [dateRange, setDateRange] = React.useState<DateRangeFilter>("ALL");
  const [cursor, setCursor] = React.useState<string | undefined>(undefined);
  const [prevCursors, setPrevCursors] = React.useState<string[]>([]);

  const [rowMenu, setRowMenu] = React.useState<string | null>(null);
  const [suspendUser, setSuspendUser] = React.useState<any>(null);
  const [banUser, setBanUser] = React.useState<any>(null);
  const [confirmAction, setConfirmAction] = React.useState<{
    user: any;
    action: "VERIFY" | "RESTORE";
  } | null>(null);

  const [suspendLength, setSuspendLength] = React.useState("7d");
  const [suspendReason, setSuspendReason] = React.useState("");
  const [banReason, setBanReason] = React.useState("");

  React.useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const adminStatus: any =
    status === "ACTIVE" ? "ALL" : status;

  const list = trpc.admin.usersList.useQuery(
    {
      search: searchDebounced || undefined,
      status: adminStatus,
      cursor,
      limit: 50,
    },
    {
      staleTime: 30_000,
    }
  );

  const updateMut = trpc.admin.usersUpdateStatus.useMutation({
    onSuccess: () => {
      void utils.admin.usersList.invalidate();
      show("User updated successfully", "success");
      setSuspendUser(null);
      setBanUser(null);
      setConfirmAction(null);
      setSuspendReason("");
      setBanReason("");
    },
    onError: (err) => {
      show(`Failed: ${err.message}`, "danger");
    },
  });

  const handleVerify = (u: any) => setConfirmAction({ user: u, action: "VERIFY" });
  const handleRestore = (u: any) => setConfirmAction({ user: u, action: "RESTORE" });

  const submitVerifyOrRestore = () => {
    if (!confirmAction) return;
    updateMut.mutate({ id: confirmAction.user.id, action: confirmAction.action });
  };

  const submitSuspend = () => {
    if (!suspendUser) return;
    let expiry: Date | undefined;
    const now = new Date();
    switch (suspendLength) {
      case "1d":
        expiry = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        break;
      case "7d":
        expiry = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        expiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        break;
      case "permanent":
        expiry = undefined;
        break;
    }
    updateMut.mutate({
      id: suspendUser.id,
      action: "SUSPEND",
      reason: suspendReason || undefined,
      suspensionExpiresAt: expiry,
    });
  };

  const submitBan = () => {
    if (!banUser) return;
    updateMut.mutate({
      id: banUser.id,
      action: "BAN",
      reason: banReason || undefined,
    });
  };

  const goNext = () => {
    if (list.data?.nextCursor) {
      setPrevCursors((p) => (cursor ? [...p, cursor] : p));
      setCursor(list.data.nextCursor);
    }
  };
  const goPrev = () => {
    setPrevCursors((p) => {
      const next = [...p];
      const last = next.pop();
      setCursor(last);
      return next;
    });
  };
  const resetPagination = () => {
    setCursor(undefined);
    setPrevCursors([]);
  };

  React.useEffect(() => {
    resetPagination();
  }, [searchDebounced, status, dateRange]);

  const pageItems: any[] = list.data?.items ?? [];

  return (
    <div className="space-y-5 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-primary/15 border border-primary/20 flex items-center justify-center">
            <UsersIcon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Users</h1>
            <p className="text-sm text-muted-foreground">
              Manage accounts, verify, suspend, or ban users
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center gap-3 w-full">
            <div className="flex-1 min-w-0">
              <Input
                placeholder="Search username, email, or display name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search className="h-4 w-4" />}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="w-[160px] flex-shrink-0">
                <Select
                  value={status}
                  onChange={(v) => setStatus(v as UserStatusFilter)}
                  options={[
                    { value: "ALL", label: "All users" },
                    { value: "ACTIVE", label: "Active" },
                    { value: "VERIFIED", label: "Verified" },
                    { value: "SUSPENDED", label: "Suspended" },
                    { value: "BANNED", label: "Banned" },
                  ]}
                  placeholder="Status"
                />
              </div>
              <div className="w-[140px] flex-shrink-0">
                <Select
                  value={dateRange}
                  onChange={(v) => setDateRange(v as DateRangeFilter)}
                  options={[
                    { value: "ALL", label: "All time" },
                    { value: "24H", label: "Last 24h" },
                    { value: "7D", label: "Last 7d" },
                    { value: "30D", label: "Last 30d" },
                  ]}
                  placeholder="Date range"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full min-w-[960px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground py-2.5">
                    User
                  </th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground py-2.5">
                    Role
                  </th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground py-2.5">
                    Status
                  </th>
                  <th className="text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground py-2.5">
                    Posts
                  </th>
                  <th className="text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground py-2.5">
                    Votes
                  </th>
                  <th className="text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground py-2.5">
                    Followers
                  </th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground py-2.5">
                    Created
                  </th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground py-2.5">
                    Last active
                  </th>
                  <th className="text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground py-2.5 pl-4 w-[80px]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {list.isLoading &&
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="border-b border-border/60 last:border-0">
                      <td colSpan={9} className="py-6">
                        <div className="h-10 bg-muted/60 rounded-lg animate-pulse" />
                      </td>
                    </tr>
                  ))}
                {!list.isLoading && pageItems.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="h-12 w-12 rounded-2xl bg-muted border border-border flex items-center justify-center">
                          <UsersIcon className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          No users match these filters
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
                {pageItems.map((u) => {
                  const isSelf = session?.user?.id === u.id;
                  return (
                    <tr
                      key={u.id}
                      className="border-b border-border/60 last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="py-3 pr-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar
                            avatarUrl={u.avatarUrl}
                            displayName={u.displayName ?? u.username}
                            username={u.username}
                            size="md"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-sm font-semibold truncate max-w-[200px]">
                                {u.displayName ?? u.username}
                              </span>
                              {u.isVerified && (
                                <CheckCircle2 className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate max-w-[260px]">
                              @{u.username} · {u.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-2">
                        {u.role === "ADMIN" ? (
                          <Badge variant="danger" size="sm" className="inline-flex items-center gap-1">
                            <Shield className="h-3 w-3" /> Admin
                          </Badge>
                        ) : u.role === "MODERATOR" ? (
                          <Badge variant="info" size="sm" className="inline-flex items-center gap-1">
                            <Crown className="h-3 w-3" /> Mod
                          </Badge>
                        ) : (
                          <Badge variant="default" size="sm">User</Badge>
                        )}
                      </td>
                      <td className="py-3 pr-2">
                        <div className="flex flex-wrap gap-1">
                          {u.isBanned ? (
                            <Badge variant="danger" size="sm" className="inline-flex items-center gap-1">
                              <Ban className="h-3 w-3" /> Banned
                            </Badge>
                          ) : u.isSuspended ? (
                            <Badge variant="warning" size="sm">
                              Suspended
                              {u.suspensionExpiresAt && (
                                <span className="ml-1 opacity-75">
                                  until {formatRelativeTime(u.suspensionExpiresAt)}
                                </span>
                              )}
                            </Badge>
                          ) : (
                            <Badge variant="success" size="sm">Active</Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-3 pr-2 text-right text-sm tabular-nums">
                        {formatNumber(u._count?.posts ?? 0)}
                      </td>
                      <td className="py-3 pr-2 text-right text-sm tabular-nums">
                        {formatNumber(u._count?.votes ?? 0)}
                      </td>
                      <td className="py-3 pr-2 text-right text-sm tabular-nums">
                        {formatNumber(u._count?.followers ?? 0)}
                      </td>
                      <td className="py-3 pr-2 text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                        {formatRelativeTime(u.createdAt)}
                      </td>
                      <td className="py-3 pr-2 text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                        {u.lastActiveAt ? formatRelativeTime(u.lastActiveAt) : "—"}
                      </td>
                      <td className="py-3 pl-4 text-right relative">
                        <div className="relative inline-block">
                          <button
                            type="button"
                            onClick={() =>
                              setRowMenu(rowMenu === u.id ? null : u.id)
                            }
                            className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                          {rowMenu === u.id && (
                            <>
                              <div
                                className="fixed inset-0 z-10"
                                onClick={() => setRowMenu(null)}
                              />
                              <div className="absolute right-0 top-full mt-1 z-20 w-52 rounded-lg border border-border bg-card shadow-popover animate-scaleIn p-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRowMenu(null);
                                    window.open(`/profile/${u.username}`, "_blank");
                                  }}
                                  className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm hover:bg-muted"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                  View profile
                                </button>
                                {!u.isVerified && !isSelf && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setRowMenu(null);
                                      handleVerify(u);
                                    }}
                                    className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm hover:bg-muted text-success"
                                  >
                                    <CheckCircle2 className="h-4 w-4" />
                                    Verify user
                                  </button>
                                )}
                                {!u.isSuspended && !u.isBanned && !isSelf && u.role === "USER" && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setRowMenu(null);
                                      setSuspendUser(u);
                                    }}
                                    className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm hover:bg-muted text-warning"
                                  >
                                    <AlertTriangle className="h-4 w-4" />
                                    Suspend user
                                  </button>
                                )}
                                {!u.isBanned && !isSelf && u.role === "USER" && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setRowMenu(null);
                                      setBanUser(u);
                                    }}
                                    className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm hover:bg-danger/10 text-danger"
                                  >
                                    <Ban className="h-4 w-4" />
                                    Ban user
                                  </button>
                                )}
                                {(u.isSuspended || u.isBanned) && !isSelf && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setRowMenu(null);
                                      handleRestore(u);
                                    }}
                                    className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm hover:bg-muted text-info"
                                  >
                                    <Undo2 className="h-4 w-4" />
                                    Restore user
                                  </button>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-5 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Showing {pageItems.length} users per page
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={goPrev}
                disabled={prevCursors.length === 0}
                leftIcon={<ChevronLeft className="h-4 w-4" />}
              >
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={goNext}
                disabled={!list.data?.hasMore}
                rightIcon={<ChevronRight className="h-4 w-4" />}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Modal
        open={!!suspendUser}
        onClose={() => !updateMut.isPending && setSuspendUser(null)}
        title={`Suspend @${suspendUser?.username ?? "user"}`}
        description="Temporarily restrict this user from accessing the platform."
        size="md"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setSuspendUser(null)}
              disabled={updateMut.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={updateMut.isPending}
              onClick={submitSuspend}
              leftIcon={<Ban className="h-4 w-4" />}
            >
              Suspend user
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Suspension length"
            value={suspendLength}
            onChange={setSuspendLength}
            options={[
              { value: "1d", label: "1 day" },
              { value: "7d", label: "7 days" },
              { value: "30d", label: "30 days" },
              { value: "permanent", label: "Permanent" },
            ]}
          />
          <Textarea
            label="Reason for suspension (optional)"
            value={suspendReason}
            onChange={(e) => setSuspendReason(e.target.value)}
            placeholder="Explain the moderation decision..."
            rows={4}
            helperText={`${suspendReason.length}/500 characters`}
          />
        </div>
      </Modal>

      <Modal
        open={!!banUser}
        onClose={() => !updateMut.isPending && setBanUser(null)}
        title={`Ban @${banUser?.username ?? "user"}?`}
        description="This will permanently remove the user's access. They will not be able to sign up again with the same email."
        size="md"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setBanUser(null)}
              disabled={updateMut.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={updateMut.isPending}
              onClick={submitBan}
              leftIcon={<Ban className="h-4 w-4" />}
            >
              Permanently ban
            </Button>
          </>
        }
      >
        <div className="flex items-start gap-3 p-4 rounded-xl bg-danger/10 border border-danger/20 mb-2">
          <AlertTriangle className="h-5 w-5 text-danger flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground">
              This action is irreversible
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              All active sessions will be revoked.
            </p>
          </div>
        </div>
        <Textarea
          label="Ban reason"
          value={banReason}
          onChange={(e) => setBanReason(e.target.value)}
          placeholder="Why is this user being banned? This will be stored for audit."
          rows={4}
          helperText={`${banReason.length}/500 characters`}
        />
      </Modal>

      <Modal
        open={!!confirmAction}
        onClose={() => !updateMut.isPending && setConfirmAction(null)}
        title={
          confirmAction?.action === "VERIFY"
            ? `Verify @${confirmAction.user.username}?`
            : `Restore @${confirmAction?.user.username ?? "user"}?`
        }
        description={
          confirmAction?.action === "VERIFY"
            ? "Mark this user as verified. They will receive a verified checkmark on their profile."
            : "Re-activate this account by removing the ban or suspension."
        }
        size="sm"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setConfirmAction(null)}
              disabled={updateMut.isPending}
            >
              Cancel
            </Button>
            <Button
              variant={confirmAction?.action === "VERIFY" ? "primary" : "primary"}
              loading={updateMut.isPending}
              onClick={submitVerifyOrRestore}
              leftIcon={
                confirmAction?.action === "VERIFY" ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Undo2 className="h-4 w-4" />
                )
              }
            >
              {confirmAction?.action === "VERIFY" ? "Verify" : "Restore"}
            </Button>
          </>
        }
      >
        <p className="text-xs text-muted-foreground">
          This action is logged to the moderation audit trail.
        </p>
      </Modal>
    </div>
  );
}
