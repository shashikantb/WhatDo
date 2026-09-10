"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  FileText,
  Flag,
  FolderTree,
  Tags,
  Megaphone,
  BarChart3,
  Settings,
  LogOut,
  ChevronRight,
  Shield,
  Home,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/design-system/Card";
import { Button } from "@/components/design-system/Button";
import { Badge } from "@/components/design-system/Badge";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, section: "Overview" },
  { href: "/admin/users", label: "Users", icon: Users, section: "Moderation" },
  { href: "/admin/posts", label: "Posts", icon: FileText, section: "Moderation" },
  { href: "/admin/reports", label: "Reports", icon: Flag, section: "Moderation", badge: true },
  { href: "/admin/categories", label: "Categories", icon: FolderTree, section: "Content" },
  { href: "/admin/tags", label: "Tags", icon: Tags, section: "Content" },
  { href: "/admin/ads", label: "Ads", icon: Megaphone, section: "Content" },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3, section: "Insights" },
  { href: "/admin/settings", label: "Settings", icon: Settings, section: "System" },
];

const sectionOrder = ["Overview", "Moderation", "Content", "Insights", "System"];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const userRole = session?.user?.role;
  const isAuthorized = userRole === "ADMIN" || userRole === "MODERATOR";

  const groupedNav = React.useMemo(() => {
    const groups: Record<string, typeof navItems> = {};
    for (const item of navItems) {
      if (!groups[item.section]) groups[item.section] = [];
      groups[item.section].push(item);
    }
    return groups;
  }, []);

  const breadcrumb = React.useMemo(() => {
    const parts = pathname.split("/").filter(Boolean);
    if (parts.length === 1) return [{ label: "Dashboard", href: "/admin" }];
    const crumbs = [{ label: "Admin", href: "/admin" }];
    for (let i = 1; i < parts.length; i++) {
      const slug = parts[i];
      const label = slug.charAt(0).toUpperCase() + slug.slice(1);
      crumbs.push({
        label,
        href: "/" + parts.slice(0, i + 1).join("/"),
      });
    }
    return crumbs;
  }, [pathname]);

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-danger/15 border border-danger/20 flex items-center justify-center mb-4">
              <AlertTriangle className="h-8 w-8 text-danger" />
            </div>
            <CardTitle className="text-xl">403 — Not Authorized</CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              You must be an Administrator or Moderator to access this area.
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button onClick={() => router.push("/feed")} fullWidth>
              <Home className="h-4 w-4 mr-2" />
              Back to feed
            </Button>
            <Button variant="ghost" onClick={() => router.push("/login")} fullWidth>
              Sign in with a different account
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-screen">
        <aside className="hidden md:flex md:flex-col w-64 lg:w-72 border-r border-border bg-card fixed inset-y-0 left-0 z-40">
          <div className="flex items-center gap-3 h-16 px-5 border-b border-border">
            <div className="h-9 w-9 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight leading-tight">WHATDO</h1>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Admin Console</p>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto p-3 space-y-5">
            {sectionOrder.map((section) =>
              groupedNav[section] ? (
                <div key={section}>
                  <p className="px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    {section}
                  </p>
                  <div className="space-y-1">
                    {groupedNav[section].map((item) => {
                      const Icon = item.icon;
                      const isActive =
                        item.href === "/admin"
                          ? pathname === "/admin"
                          : pathname.startsWith(item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 group",
                            isActive
                              ? "bg-primary/10 text-primary border border-primary/15"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent"
                          )}
                        >
                          <Icon className={cn("h-4 w-4", isActive ? "text-primary" : "group-hover:text-foreground")} />
                          <span className="flex-1">{item.label}</span>
                          {item.badge && (
                            <Badge variant="danger" size="sm">!</Badge>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ) : null
            )}
          </nav>

          <div className="p-3 border-t border-border space-y-1">
            <Link
              href="/feed"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
            >
              <LogOut className="h-4 w-4" />
              <span className="flex-1">Exit Admin</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </aside>

        <div className="flex-1 md:ml-64 lg:ml-72 min-w-0 flex flex-col">
          <header className="sticky top-0 z-30 h-16 border-b border-border bg-background/80 backdrop-blur-md flex items-center justify-between px-4 md:px-6">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <button
                type="button"
                className="md:hidden h-9 w-9 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted"
                onClick={() => setMobileOpen((v) => !v)}
                aria-label="Toggle menu"
              >
                <LayoutDashboard className="h-5 w-5" />
              </button>
              <nav className="flex items-center gap-1 text-sm min-w-0 overflow-x-auto">
                {breadcrumb.map((c, i) => (
                  <React.Fragment key={c.href}>
                    {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
                    {i === breadcrumb.length - 1 ? (
                      <span className="font-medium text-foreground truncate">{c.label}</span>
                    ) : (
                      <Link
                        href={c.href}
                        className="text-muted-foreground hover:text-foreground truncate flex-shrink-0"
                      >
                        {c.label}
                      </Link>
                    )}
                  </React.Fragment>
                ))}
              </nav>
            </div>
            <div className="flex items-center gap-2 ml-4 flex-shrink-0">
              <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
                <Link href="/feed" target="_blank" rel="noreferrer">
                  View site as user
                </Link>
              </Button>
            </div>
          </header>

          <main className="flex-1 min-w-0">
            <div className="px-4 md:px-6 lg:px-8 py-6">
              {children}
            </div>
          </main>
        </div>

        {mobileOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/50 md:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <aside className="fixed inset-y-0 left-0 z-50 w-72 border-r border-border bg-card md:hidden animate-slideInLeft">
              <div className="flex items-center gap-3 h-16 px-5 border-b border-border">
                <div className="h-9 w-9 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-sm font-bold tracking-tight leading-tight">WHATDO</h1>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Admin Console</p>
                </div>
              </div>
              <nav className="flex-1 overflow-y-auto p-3 space-y-5 max-h-[calc(100vh-4rem)]">
                {sectionOrder.map((section) =>
                  groupedNav[section] ? (
                    <div key={section}>
                      <p className="px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        {section}
                      </p>
                      <div className="space-y-1">
                        {groupedNav[section].map((item) => {
                          const Icon = item.icon;
                          const isActive =
                            item.href === "/admin"
                              ? pathname === "/admin"
                              : pathname.startsWith(item.href);
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={() => setMobileOpen(false)}
                              className={cn(
                                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                                isActive
                                  ? "bg-primary/10 text-primary border border-primary/15"
                                  : "text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent"
                              )}
                            >
                              <Icon className="h-4 w-4" />
                              <span className="flex-1">{item.label}</span>
                              {item.badge && <Badge variant="danger" size="sm">!</Badge>}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  ) : null
                )}
                <Link
                  href="/feed"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="flex-1">Exit Admin</span>
                </Link>
              </nav>
            </aside>
          </>
        )}
      </div>
    </div>
  );
}
