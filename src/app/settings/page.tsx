"use client";

import * as React from "react";
import { AppShell } from "@/components/layout/AppShell";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/design-system/Card";
import { Button } from "@/components/design-system/Button";
import { Input } from "@/components/design-system/Input";
import { Textarea } from "@/components/design-system/Textarea";
import { Badge } from "@/components/design-system/Badge";
import { Modal } from "@/components/design-system/Modal";
import { useToast } from "@/components/design-system/Toaster";
import {
  User,
  Shield,
  Bell as BellIcon,
  Palette,
  Info,
  ChevronRight,
  Upload,
  Trash2,
  Mail,
  Smartphone,
  AlertTriangle,
  LogOut,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/shared/ThemeProvider";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

interface SettingSectionProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  children: React.ReactNode;
  iconColor: string;
}

const SettingSection: React.FC<SettingSectionProps> = ({
  icon: Icon,
  title,
  description,
  children,
  iconColor,
}) => (
  <Card>
    <CardHeader className="pb-4">
      <div className="flex items-start gap-3">
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconColor}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
      </div>
    </CardHeader>
    <CardContent className="space-y-4 pt-0 border-t border-border">
      {children}
    </CardContent>
  </Card>
);

interface SettingRowProps {
  label: string;
  description?: string;
  action: React.ReactNode;
}

const SettingRow: React.FC<SettingRowProps> = ({
  label,
  description,
  action,
}) => (
  <div className="flex items-center justify-between gap-4 py-2">
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-foreground">{label}</p>
      {description && (
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      )}
    </div>
    <div className="flex-shrink-0">{action}</div>
  </div>
);

interface SwitchToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}

const SwitchToggle: React.FC<SwitchToggleProps> = ({ checked, onChange, disabled }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={cn(
      "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-ring",
      checked ? "bg-primary" : "bg-muted",
      disabled && "opacity-50 cursor-not-allowed",
    )}
  >
    <span
      className={cn(
        "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
        checked ? "translate-x-5" : "translate-x-0",
      )}
    />
  </button>
);

type PrefKey =
  | "notifyOnVotes"
  | "notifyOnComments"
  | "notifyOnFollowers"
  | "notifyOnPredictions"
  | "notifyOnTrending"
  | "notifyOnMarketingPush"
  | "emailOnVotes"
  | "emailOnComments"
  | "emailOnFollowers"
  | "emailOnPredictions"
  | "emailOnTrending"
  | "emailMarketing";

const NOTIFICATION_CATEGORIES: {
  key: Exclude<PrefKey, "emailMarketing">;
  label: string;
  channel: "email" | "push";
}[] = [
  { key: "notifyOnVotes", label: "Votes on my post", channel: "push" },
  { key: "emailOnVotes", label: "Votes on my post", channel: "email" },
  { key: "notifyOnComments", label: "Comments & replies", channel: "push" },
  { key: "emailOnComments", label: "Comments & replies", channel: "email" },
  { key: "notifyOnFollowers", label: "New followers", channel: "push" },
  { key: "emailOnFollowers", label: "New followers", channel: "email" },
  { key: "notifyOnPredictions", label: "Prediction results", channel: "push" },
  { key: "emailOnPredictions", label: "Prediction results", channel: "email" },
  { key: "notifyOnTrending", label: "Trending alerts", channel: "push" },
  { key: "emailOnTrending", label: "Trending alerts", channel: "email" },
  { key: "notifyOnMarketingPush", label: "Marketing & product updates", channel: "push" },
];

type ThemeOption = "light" | "dark" | "system";

export default function SettingsPage() {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const { show } = useToast();
  const utils = trpc.useUtils();
  const router = useRouter();

  const { data: me, isLoading: meLoading } = trpc.auth.me.useQuery();
  const { data: prefs, isLoading: prefsLoading } = trpc.auth.getUserPreferences.useQuery();

  const [displayName, setDisplayName] = React.useState("");
  const [bio, setBio] = React.useState("");
  const [username, setUsername] = React.useState("");
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);
  const [profileChanged, setProfileChanged] = React.useState(false);

  const [allowAnonymousPosts, setAllowAnonymousPosts] = React.useState(false);
  const [allowSearchIndexing, setAllowSearchIndexing] = React.useState(true);
  const [autoPlayVideos, setAutoPlayVideos] = React.useState(true);
  const [localNotifPrefs, setLocalNotifPrefs] = React.useState<Record<string, boolean>>({});
  const [marketingEmail, setMarketingEmail] = React.useState(false);

  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleteText, setDeleteText] = React.useState("");

  React.useEffect(() => {
    if (me) {
      setDisplayName(me.displayName ?? "");
      setBio(me.bio ?? "");
      setUsername(me.username ?? "");
      setAvatarUrl(me.avatarUrl ?? null);
    }
  }, [me]);

  React.useEffect(() => {
    if (prefs) {
      setAutoPlayVideos(prefs.autoPlayVideos ?? true);
      setMarketingEmail(prefs.marketingEmails ?? false);
      setLocalNotifPrefs((prev) => ({
        notifyOnVotes: prefs.pushNotifications ?? true,
        notifyOnComments: prefs.pushNotifications ?? true,
        notifyOnFollowers: prefs.pushNotifications ?? true,
        notifyOnPredictions: prefs.pushNotifications ?? true,
        notifyOnTrending: prefs.pushNotifications ?? false,
        notifyOnMarketingPush: prefs.pushNotifications ?? false,
        emailOnVotes: prefs.emailNotifications ?? true,
        emailOnComments: prefs.emailNotifications ?? false,
        emailOnFollowers: prefs.emailNotifications ?? false,
        emailOnPredictions: prefs.emailNotifications ?? true,
        emailOnTrending: prefs.emailNotifications ?? false,
        ...prev,
      }));
    }
  }, [prefs]);

  const updateProfile = trpc.auth.updateProfile.useMutation({
    onSuccess: (user) => {
      utils.auth.me.invalidate();
      show({ variant: "success", title: "Profile updated", description: "Your changes have been saved." });
      setProfileChanged(false);
      if (user.username && user.username !== session?.user?.username) {
        window.setTimeout(() => {
          window.location.href = `/profile/${user.username}`;
        }, 400);
      }
    },
    onError: (err) => {
      show({ variant: "error", title: "Could not save", description: err.message });
    },
  });

  const updatePreferences = trpc.auth.updatePreferences.useMutation({
    onSuccess: () => {
      utils.auth.getUserPreferences.invalidate();
    },
    onError: (err) => {
      show({ variant: "error", title: "Could not save preferences", description: err.message });
    },
  });

  const deleteAccount = trpc.auth.deleteAccount.useMutation({
    onSuccess: () => {
      show({ variant: "success", title: "Account deleted" });
      setDeleteOpen(false);
      signOut({ callbackUrl: "/" });
    },
    onError: (err) => {
      show({ variant: "error", title: "Could not delete account", description: err.message });
    },
  });

  const avatarFileInputRef = React.useRef<HTMLInputElement | null>(null);

  const onPickAvatar = () => {
    avatarFileInputRef.current?.click();
  };

  const onAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setAvatarUrl(dataUrl);
      setProfileChanged(true);
    };
    reader.readAsDataURL(file);
  };

  const onSaveProfile = () => {
    if (!username || !/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      show({ variant: "error", title: "Invalid username", description: "Username must be 3-20 chars of letters, numbers, or _." });
      return;
    }
    updateProfile.mutate({
      displayName: displayName.trim() || undefined,
      bio: bio.trim() || undefined,
      username,
      avatarUrl: avatarUrl ?? undefined,
    });
  };

  const toggleLocalPref = (key: string) => {
    setLocalNotifPrefs((prev) => {
      const next = { ...prev, [key]: !(prev[key] ?? false) };
      const patch: Record<string, boolean> = {};
      if (key.startsWith("email")) {
        const anyEmailOn = Object.entries(next).some(([k, v]) => k.startsWith("email") && v);
        patch.emailNotifications = anyEmailOn;
      } else if (key.startsWith("notify")) {
        const anyPushOn = Object.entries(next).some(([k, v]) => k.startsWith("notify") && v);
        patch.pushNotifications = anyPushOn;
      }
      if (key === "notifyOnMarketingPush") {
        patch.marketingEmails = next[key] || marketingEmail;
      }
      updatePreferences.mutate(patch);
      return next;
    });
  };

  const togglePrivacy = (key: "allowAnonymousPosts" | "allowSearchIndexing") => {
    if (key === "allowAnonymousPosts") {
      setAllowAnonymousPosts((p) => {
        const next = !p;
        updatePreferences.mutate({});
        return next;
      });
    } else {
      setAllowSearchIndexing((p) => {
        const next = !p;
        updatePreferences.mutate({});
        return next;
      });
    }
  };

  const toggleAutoPlay = () => {
    setAutoPlayVideos((p) => {
      const next = !p;
      updatePreferences.mutate({ autoPlayVideos: next });
      return next;
    });
  };

  const toggleMarketingEmail = () => {
    setMarketingEmail((p) => {
      const next = !p;
      updatePreferences.mutate({ marketingEmails: next });
      return next;
    });
  };

  const setThemePersist = (t: ThemeOption) => {
    setTheme(t);
    updatePreferences.mutate({ theme: t });
  };

  const onConfirmDelete = () => {
    if (deleteText !== "DELETE") {
      show({ variant: "error", title: "Type DELETE to confirm" });
      return;
    }
    deleteAccount.mutate({ confirmation: "DELETE" });
  };

  const pushCats = NOTIFICATION_CATEGORIES.filter((n) => n.channel === "push");
  const emailCats = NOTIFICATION_CATEGORIES.filter((n) => n.channel === "email");

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto">
        <div className="px-4 pt-4 md:px-6 md:pt-6 pb-4 md:pb-6 space-y-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="space-y-5">
              <SettingSection
                icon={User}
                title="Account"
                description="Manage your profile and login details"
                iconColor="bg-primary/15 text-primary border border-primary/20"
              >
                <SettingRow
                  label="Profile picture"
                  description="Upload a new avatar"
                  action={
                    <div className="flex items-center gap-2">
                      <input
                        ref={avatarFileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={onAvatarFile}
                      />
                      <UserAvatar
                        user={{
                          id: me?.id,
                          avatarUrl: avatarUrl ?? me?.avatarUrl ?? null,
                          displayName: displayName || me?.displayName ?? null,
                          username: username || me?.username ?? null,
                          role: me?.role as any,
                          isVerified: me?.isVerified,
                        }}
                        size="md"
                      />
                      <Button variant="outline" size="sm" onClick={onPickAvatar}>
                        <Upload className="h-4 w-4 mr-1.5" />
                        Change
                      </Button>
                    </div>
                  }
                />
                <SettingRow
                  label="Email address"
                  description={session?.user?.email ?? "Not connected"}
                  action={
                    <Badge variant="outline" className="font-normal">
                      <Mail className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                      Verified
                    </Badge>
                  }
                />
                <div className="py-2">
                  <p className="text-sm font-medium text-foreground mb-1">Username</p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">@</span>
                    <Input
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        setProfileChanged(true);
                      }}
                      placeholder="your_username"
                      className="flex-1"
                      disabled={meLoading}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    3-20 characters, letters, numbers, underscores only.
                  </p>
                </div>
                <div className="py-2">
                  <p className="text-sm font-medium text-foreground mb-1">Display name</p>
                  <Input
                    value={displayName}
                    onChange={(e) => {
                      setDisplayName(e.target.value);
                      setProfileChanged(true);
                    }}
                    placeholder="What should we call you?"
                    disabled={meLoading}
                  />
                </div>
                <div className="py-2">
                  <p className="text-sm font-medium text-foreground mb-1">Bio</p>
                  <Textarea
                    value={bio}
                    onChange={(e) => {
                      setBio(e.target.value);
                      setProfileChanged(true);
                    }}
                    placeholder="Tell the WHATDO community a bit about you"
                    rows={3}
                    disabled={meLoading}
                  />
                  <p className="text-xs text-muted-foreground mt-1 text-right">
                    {bio.length}/200
                  </p>
                </div>
                <div className="flex justify-end pt-2">
                  <Button
                    variant="primary"
                    onClick={onSaveProfile}
                    loading={updateProfile.isPending}
                    disabled={!profileChanged || meLoading}
                  >
                    Save changes
                  </Button>
                </div>
              </SettingSection>

              <SettingSection
                icon={Shield}
                title="Privacy"
                description="Control who can see your posts and profile"
                iconColor="bg-success/15 text-success border border-success/20"
              >
                <SettingRow
                  label="Allow anonymous posts by default"
                  description="Hide your name automatically on new posts you create"
                  action={
                    <SwitchToggle
                      checked={allowAnonymousPosts}
                      onChange={() => togglePrivacy("allowAnonymousPosts")}
                    />
                  }
                />
                <SettingRow
                  label="Allow search engines to index my profile"
                  description="Let Google and other search engines surface your public profile"
                  action={
                    <SwitchToggle
                      checked={allowSearchIndexing}
                      onChange={() => togglePrivacy("allowSearchIndexing")}
                    />
                  }
                />
              </SettingSection>

              <SettingSection
                icon={Palette}
                title="Appearance"
                description="Customize the look and feel of WHATDO"
                iconColor="bg-accent/15 text-accent border border-accent/20"
              >
                <SettingRow
                  label="Theme"
                  description="Switch between light, dark, or match your system"
                  action={
                    <div className="inline-flex rounded-lg border border-border p-1 bg-muted/30">
                      {(["light", "dark", "system"] as ThemeOption[]).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setThemePersist(t)}
                          className={cn(
                            "px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors",
                            theme === t
                              ? "bg-card border border-border text-foreground shadow-sm"
                              : "text-muted-foreground hover:text-foreground",
                          )}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  }
                />
                <SettingRow
                  label="Auto-play videos"
                  description="Disable to reduce data usage on mobile networks"
                  action={
                    <SwitchToggle
                      checked={autoPlayVideos}
                      onChange={toggleAutoPlay}
                      disabled={prefsLoading}
                    />
                  }
                />
              </SettingSection>
            </div>

            <div className="space-y-5">
              <SettingSection
                icon={BellIcon}
                title="Notifications"
                description="Choose how you want to be notified"
                iconColor="bg-warning/15 text-warning border border-warning/20"
              >
                <div className="py-2">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-medium text-foreground flex items-center gap-2">
                        <Smartphone className="h-4 w-4 text-warning" />
                        Push notifications
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        On device, delivered instantly
                      </p>
                    </div>
                  </div>
                  <div className="pl-1 space-y-1 border-l-2 border-border ml-1">
                    {pushCats.map((c) => (
                      <div key={c.key} className="flex items-center justify-between py-1.5 pl-3">
                        <p className="text-sm text-foreground">{c.label}</p>
                        <SwitchToggle
                          checked={localNotifPrefs[c.key] ?? false}
                          onChange={() => toggleLocalPref(c.key)}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-medium text-foreground flex items-center gap-2">
                        <Mail className="h-4 w-4 text-warning" />
                        Email notifications
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Digests and important updates
                      </p>
                    </div>
                  </div>
                  <div className="pl-1 space-y-1 border-l-2 border-border ml-1">
                    {emailCats.map((c) => (
                      <div key={c.key} className="flex items-center justify-between py-1.5 pl-3">
                        <p className="text-sm text-foreground">{c.label}</p>
                        <SwitchToggle
                          checked={localNotifPrefs[c.key] ?? false}
                          onChange={() => toggleLocalPref(c.key)}
                        />
                      </div>
                    ))}
                    <div className="flex items-center justify-between py-1.5 pl-3">
                      <p className="text-sm text-foreground">Marketing & product updates</p>
                      <SwitchToggle
                        checked={marketingEmail}
                        onChange={toggleMarketingEmail}
                        disabled={prefsLoading}
                      />
                    </div>
                  </div>
                </div>
              </SettingSection>

              <SettingSection
                icon={Info}
                title="About"
                description="Learn more about WHATDO"
                iconColor="bg-muted text-muted-foreground border border-border"
              >
                <SettingRow
                  label="App version"
                  description="0.1.0"
                  action={<Badge variant="outline">v0.1.0</Badge>}
                />
                <SettingRow
                  label="Terms of Service"
                  description="The rules that govern using WHATDO"
                  action={
                    <button
                      type="button"
                      className="inline-flex items-center text-sm text-primary hover:text-primary/80"
                    >
                      Open <ChevronRight className="h-4 w-4 ml-0.5" />
                    </button>
                  }
                />
                <SettingRow
                  label="Privacy Policy"
                  description="How we store and protect your data"
                  action={
                    <button
                      type="button"
                      className="inline-flex items-center text-sm text-primary hover:text-primary/80"
                    >
                      Open <ChevronRight className="h-4 w-4 ml-0.5" />
                    </button>
                  }
                />
                <SettingRow
                  label="Community Guidelines"
                  description="Expected behavior on the platform"
                  action={
                    <button
                      type="button"
                      className="inline-flex items-center text-sm text-primary hover:text-primary/80"
                    >
                      Open <ChevronRight className="h-4 w-4 ml-0.5" />
                    </button>
                  }
                />
                <div className="pt-3 space-y-3">
                  <div className="rounded-lg border border-border bg-muted/30 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <div className="h-9 w-9 rounded-lg bg-secondary/70 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <LogOut className="h-4.5 w-4.5 text-foreground/80" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground">
                            Log out of your account
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            End your current session on this device. You'll need to sign in again to access your profile and saved posts.
                          </p>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={async () => {
                            try {
                              await signOut({ redirect: false });
                            } catch {}
                            router.push("/feed");
                            router.refresh();
                          }}
                        >
                          <LogOut className="h-4 w-4 mr-1.5" />
                          Log out
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-danger/30 bg-danger/5 p-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-5 w-5 text-danger flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-danger">
                          Permanently delete your account
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          This will erase your profile, posts, votes, and all associated data. It
                          cannot be undone.
                        </p>
                        <div className="mt-3">
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => setDeleteOpen(true)}
                          >
                            <Trash2 className="h-4 w-4 mr-1.5" />
                            Delete account
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </SettingSection>
            </div>
          </div>
        </div>
      </div>

      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-danger/15 text-danger flex items-center justify-center border border-danger/20">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold tracking-tight">Delete your account?</h3>
              <p className="text-sm text-muted-foreground">
                This action is permanent and cannot be reversed.
              </p>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
            <ul className="list-disc pl-5 space-y-1">
              <li>Your profile, posts, comments, and votes will be deleted.</li>
              <li>You will be immediately signed out of all devices.</li>
              <li>Your username will be released for someone else to claim.</li>
            </ul>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">
              Type <span className="font-bold text-danger">DELETE</span> to confirm
            </label>
            <Input
              value={deleteText}
              onChange={(e) => setDeleteText(e.target.value)}
              placeholder="DELETE"
              className="mt-1.5"
              autoFocus={deleteOpen}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteOpen(false);
                setDeleteText("");
              }}
              disabled={deleteAccount.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={onConfirmDelete}
              loading={deleteAccount.isPending}
              disabled={deleteText !== "DELETE"}
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              Yes, delete account
            </Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
