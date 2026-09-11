"use client";

import * as React from "react";
import {
  Settings as SettingsIcon,
  Save,
  Zap,
  TrendingUp,
  Rss as Feed,
  Shield,
  Bot,
  ShieldCheck,
  Mail,
  AlertTriangle,
  Info,
  Sparkles,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { useToast } from "@/components/design-system/Toaster";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/design-system/Card";
import { Badge } from "@/components/design-system/Badge";
import { Button } from "@/components/design-system/Button";
import { Input } from "@/components/design-system/Input";
import { Textarea } from "@/components/design-system/Textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/design-system/Tabs";

const DEFAULT_SETTINGS = {
  opinion: {
    scorePerVote: 1,
    scorePerPost: 5,
    minMultiplier: 0.1,
    diminishingFactor: 0.1,
  },
  trending: {
    freshness: 0.25,
    engagement: 0.35,
    velocity: 0.2,
    creatorQuality: 0.1,
    diversity: 0.1,
    featuredBonus: 5.0,
  },
  feed: {
    featuredWeight: 5.0,
    diversityPenaltyPerPost: 0.2,
    trending: 0.4,
    virality: 0.3,
    controversy: 0.1,
    freshness: 0.2,
  },
  rateLimits: {
    createPost: 10,
    createComment: 30,
    vote: 100,
    follow: 50,
    upload: 20,
  },
  moderation: {
    autoEscalateThreshold: 3,
    aiModeration: true,
    aiProvider: "internal",
    autoHideThreshold: 8,
  },
  policies: {
    contentVersion: "1.2.0",
    captchaThreshold: 3,
  },
  email: {
    smtpHost: "smtp.example.com",
    smtpPort: "587",
    sender: "no-reply@whatdo.example",
  },
};

type Settings = typeof DEFAULT_SETTINGS;

function NumField({
  label, value, onChange, min, max, step = 0.01, hint,
}: {
  label: string; value: number; onChange: (n: number) => void; min?: number; max?: number; step?: number; hint?: string;
}) {
  return (
    <Input
      label={label}
      type="number"
      value={value}
      step={step}
      min={min}
      max={max}
      onChange={(e) => onChange(Number(e.target.value) || 0)}
      helperText={hint}
    />
  );
}

export default function AdminSettingsPage() {
  const { show } = useToast();
  const [tab, setTab] = React.useState("scoring");
  const [settings, setSettings] = React.useState<Settings>(DEFAULT_SETTINGS);
  const [dirty, setDirty] = React.useState(false);

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem("wd:settings");
      if (stored) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) });
    } catch {
    }
  }, []);

  const saveMut = trpc.admin.settingsUpdate.useMutation({
    onSuccess: () => {
      try {
        localStorage.setItem("wd:settings", JSON.stringify(settings));
      } catch {
      }
      setDirty(false);
      show("Settings saved", "success");
    },
    onError: (err) => show(`Failed: ${err.message}`, "danger"),
  });

  const update = <K extends keyof Settings>(section: K, key: any, value: any) => {
    setDirty(true);
    setSettings((s) => ({
      ...s,
      [section]: { ...(s[section] as any), [key]: value },
    }));
  };

  const handleSave = () => {
    saveMut.mutate(settings as any);
  };

  const reset = () => {
    setSettings(DEFAULT_SETTINGS);
    setDirty(true);
    show("Settings reset to defaults", "info");
  };

  return (
    <div className="space-y-5 max-w-[1400px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-muted border border-border flex items-center justify-center">
            <SettingsIcon className="h-6 w-6 text-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">System Settings</h1>
            <p className="text-sm text-muted-foreground">
              Tune algorithms, rate limits, and moderation thresholds
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="default" size="sm" className="inline-flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            v1.2.0 · Policies
          </Badge>
          {dirty && <Badge variant="warning" size="sm">Unsaved changes</Badge>}
          <Button variant="ghost" onClick={reset} size="sm">
            Reset
          </Button>
          <Button onClick={handleSave} loading={saveMut.isPending} size="sm" leftIcon={<Save className="h-4 w-4" />}>
            Save Settings
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full overflow-x-auto flex-wrap h-auto p-1">
          <TabsTrigger value="scoring" className="inline-flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5" /> Opinion scoring
          </TabsTrigger>
          <TabsTrigger value="trending" className="inline-flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" /> Trending algo
          </TabsTrigger>
          <TabsTrigger value="feed" className="inline-flex items-center gap-1.5">
            <Feed className="h-3.5 w-3.5" /> Feed algo
          </TabsTrigger>
          <TabsTrigger value="rate" className="inline-flex items-center gap-1.5">
            <Info className="h-3.5 w-3.5" /> Rate limits
          </TabsTrigger>
          <TabsTrigger value="moderation" className="inline-flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5" /> Moderation
          </TabsTrigger>
          <TabsTrigger value="content" className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" /> Content policies
          </TabsTrigger>
          <TabsTrigger value="email" className="inline-flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5" /> Email
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scoring">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4 text-warning" />
                Opinion Score Multipliers
              </CardTitle>
              <CardDescription>
                Controls how users earn reputation/opinion score on the platform.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <NumField label="Score per vote cast" value={settings.opinion.scorePerVote} onChange={(v) => update("opinion", "scorePerVote", v)} step={1} />
              <NumField label="Score per post created" value={settings.opinion.scorePerPost} onChange={(v) => update("opinion", "scorePerPost", v)} step={1} />
              <NumField label="Min score multiplier" value={settings.opinion.minMultiplier} onChange={(v) => update("opinion", "minMultiplier", v)} step={0.01} hint="Floors how low reputation can decay" />
              <NumField label="Diminishing factor" value={settings.opinion.diminishingFactor} onChange={(v) => update("opinion", "diminishingFactor", v)} step={0.01} hint="Reduces returns on repeated actions" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trending">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-danger" />
                Trending Algorithm Weights
              </CardTitle>
              <CardDescription>
                Weights sum to ~1. Featured bonus is additive in score units.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <NumField label="Freshness weight" value={settings.trending.freshness} onChange={(v) => update("trending", "freshness", v)} />
              <NumField label="Engagement weight" value={settings.trending.engagement} onChange={(v) => update("trending", "engagement", v)} />
              <NumField label="Velocity weight" value={settings.trending.velocity} onChange={(v) => update("trending", "velocity", v)} />
              <NumField label="Creator quality weight" value={settings.trending.creatorQuality} onChange={(v) => update("trending", "creatorQuality", v)} />
              <NumField label="Diversity weight" value={settings.trending.diversity} onChange={(v) => update("trending", "diversity", v)} />
              <NumField label="Featured bonus (additive)" value={settings.trending.featuredBonus} onChange={(v) => update("trending", "featuredBonus", v)} step={0.1} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="feed">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Feed className="h-4 w-4 text-primary" />
                Feed Algorithm Weights
              </CardTitle>
              <CardDescription>
                Mix of signals that determine For-You ordering.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <NumField label="Featured weight" value={settings.feed.featuredWeight} onChange={(v) => update("feed", "featuredWeight", v)} step={0.1} />
              <NumField label="Diversity penalty per post" value={settings.feed.diversityPenaltyPerPost} onChange={(v) => update("feed", "diversityPenaltyPerPost", v)} step={0.05} />
              <NumField label="Trending weight" value={settings.feed.trending} onChange={(v) => update("feed", "trending", v)} />
              <NumField label="Virality weight" value={settings.feed.virality} onChange={(v) => update("feed", "virality", v)} />
              <NumField label="Controversy weight" value={settings.feed.controversy} onChange={(v) => update("feed", "controversy", v)} />
              <NumField label="Freshness weight" value={settings.feed.freshness} onChange={(v) => update("feed", "freshness", v)} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rate">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Info className="h-4 w-4 text-info" />
                Rate Limits (per hour per user)
              </CardTitle>
              <CardDescription>
                Prevents abuse. 0 = unlimited (not recommended).
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <NumField label="Create posts" value={settings.rateLimits.createPost} onChange={(v) => update("rateLimits", "createPost", v)} step={1} />
              <NumField label="Create comments" value={settings.rateLimits.createComment} onChange={(v) => update("rateLimits", "createComment", v)} step={1} />
              <NumField label="Votes" value={settings.rateLimits.vote} onChange={(v) => update("rateLimits", "vote", v)} step={1} />
              <NumField label="Follows" value={settings.rateLimits.follow} onChange={(v) => update("rateLimits", "follow", v)} step={1} />
              <NumField label="Media uploads" value={settings.rateLimits.upload} onChange={(v) => update("rateLimits", "upload", v)} step={1} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="moderation">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-danger" />
                Moderation Auto-Thresholds
              </CardTitle>
              <CardDescription>
                Automatic queue behaviors based on aggregated reports.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <NumField
                  label="Reports → UNDER_REVIEW"
                  value={settings.moderation.autoEscalateThreshold}
                  onChange={(v) => update("moderation", "autoEscalateThreshold", v)}
                  step={1}
                  hint="N reports auto-escalates to Under Review"
                />
                <NumField
                  label="Reports → auto hide"
                  value={settings.moderation.autoHideThreshold}
                  onChange={(v) => update("moderation", "autoHideThreshold", v)}
                  step={1}
                  hint="Hard-hide after N cumulative reports"
                />
                <div>
                  <label className="text-sm font-medium mb-2 block">AI moderation provider</label>
                  <select
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                    value={settings.moderation.aiProvider}
                    onChange={(e) => update("moderation", "aiProvider", e.target.value)}
                  >
                    <option value="internal">Internal (rules + keywords)</option>
                    <option value="openai">OpenAI Moderation API</option>
                    <option value="google">Google Safety AI</option>
                    <option value="aws">AWS Rekognition / Comprehend</option>
                    <option value="custom">Custom webhook</option>
                  </select>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-muted/40 border border-border flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="flex items-start gap-3">
                  <Bot className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold">AI-assisted moderation</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      When enabled, posts and comments are pre-scored before being published to the feed.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => update("moderation", "aiModeration", !settings.moderation.aiModeration)}
                  className={`relative w-12 h-7 rounded-full transition-colors ${
                    settings.moderation.aiModeration ? "bg-success" : "bg-muted-foreground/30"
                  }`}
                  aria-pressed={settings.moderation.aiModeration}
                >
                  <span
                    className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${
                      settings.moderation.aiModeration ? "translate-x-[22px]" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-success" />
                Content Policies & CAPTCHA
              </CardTitle>
              <CardDescription>
                Policy versioning and anti-abuse protection.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Content policies version"
                value={settings.policies.contentVersion}
                onChange={(e) => update("policies", "contentVersion", e.target.value)}
                helperText="Bump this when TOS/Guidelines update"
              />
              <NumField
                label="CAPTCHA threshold (actions/hr)"
                value={settings.policies.captchaThreshold}
                onChange={(v) => update("policies", "captchaThreshold", v)}
                step={1}
                hint="After N actions, require CAPTCHA to continue"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Mail className="h-4 w-4 text-info" />
                Email SMTP Placeholder
              </CardTitle>
              <CardDescription>
                Email sending. Stored in env vars in production; this UI is a reference panel.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 rounded-xl bg-info/10 border border-info/20 text-xs text-info-foreground flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0 text-info" />
                <span>
                  SMTP credentials are never stored here. Configure via environment variables (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS) and restart the server.
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input label="SMTP host" value={settings.email.smtpHost} onChange={(e) => update("email", "smtpHost", e.target.value)} />
                <Input label="SMTP port" value={settings.email.smtpPort} onChange={(e) => update("email", "smtpPort", e.target.value)} />
                <Input label="Sender address" value={settings.email.sender} onChange={(e) => update("email", "sender", e.target.value)} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
