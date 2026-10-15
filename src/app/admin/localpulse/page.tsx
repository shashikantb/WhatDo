"use client";

import * as React from "react";
import {
  Film,
  Sparkles,
  MapPin,
  ToggleLeft,
  ToggleRight,
  Wand2,
  Loader2,
  Image as ImageIcon,
  ExternalLink,
  Bot,
  Info,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { useToast } from "@/components/design-system/Toaster";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/design-system/Card";
import { Badge } from "@/components/design-system/Badge";
import { Button } from "@/components/design-system/Button";
import { Input } from "@/components/design-system/Input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/design-system/Tabs";
import { getCurrentPosition } from "@/lib/utils";

export default function AdminLocalPulsePage() {
  const { show } = useToast();
  const utils = trpc.useUtils();

  const [enabled, setEnabled] = React.useState(false);
  const [maxPerLocation, setMaxPerLocation] = React.useState(2);
  const [minNearbyPosts, setMinNearbyPosts] = React.useState(3);

  const [genLat, setGenLat] = React.useState("");
  const [genLng, setGenLng] = React.useState("");
  const [genCity, setGenCity] = React.useState("");
  const [genCount, setGenCount] = React.useState(2);
  const [genLoading, setGenLoading] = React.useState(false);
  const [genResult, setGenResult] = React.useState<{ id: string; slug: string; caption: string }[]>([]);
  const [activeTab, setActiveTab] = React.useState("autogen");

  const settingsQuery = trpc.admin.localpulseGetSettings.useQuery();
  const updateSettings = trpc.admin.localpulseUpdateSettings.useMutation({
    onSuccess: () => {
      show("LocalPulse settings saved", "success");
      utils.admin.localpulseGetSettings.invalidate();
    },
    onError: (err) => show(`Failed: ${err.message}`, "danger"),
  });
  const generateMut = trpc.admin.localpulseGenerateForLocation.useMutation({
    onSuccess: (data) => {
      setGenResult(data.posts);
      show(`Generated ${data.created} post(s) created!`, "success");
      utils.admin.localpulseGetSettings.invalidate();
    },
    onError: (err) => show(`Failed: ${err.message}`, "danger"),
  });

  React.useEffect(() => {
    if (settingsQuery.data) {
      setEnabled(settingsQuery.data.enabled);
      setMaxPerLocation(settingsQuery.data.maxPerLocation);
      setMinNearbyPosts(settingsQuery.data.minNearbyPosts);
    }
  }, [settingsQuery.data]);

  const handleToggle = (next: boolean) => {
    setEnabled(next);
    updateSettings.mutate({ enabled: next });
  };

  const handleSaveNumbers = () => {
    updateSettings.mutate({ maxPerLocation, minNearbyPosts });
  };

  const handleUseMyLocation = async () => {
    try {
      const { latitude, longitude } = await getCurrentPosition();
      setGenLat(latitude.toFixed(6));
      setGenLng(longitude.toFixed(6));
      show("Location captured", "success");
    } catch {
      show("Could not get your location", "danger");
    }
  };

  const handleGenerate = () => {
    const lat = parseFloat(genLat);
    const lng = parseFloat(genLng);
    if (isNaN(lat) || isNaN(lng)) {
      show("Please enter valid latitude and longitude", "danger");
      return;
    }
    setGenLoading(true);
    setGenResult([]);
    generateMut.mutate(
      {
        latitude: lat,
        longitude: lng,
        city: genCity.trim() || undefined,
        count: genCount,
      },
      {
        onSettled: () => setGenLoading(false),
      },
    );
  };

  const s = settingsQuery.data;

  return (
    <div className="space-y-5 max-w-[1400px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-fuchsia-500/15 border border-fuchsia-500/20 flex items-center justify-center">
            <Film className="h-6 w-6 text-fuchsia-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">LocalPulse Content</h1>
            <p className="text-sm text-muted-foreground">
              AI-generated location-based reels/shorts to seed the feed</p>
          </div>
        </div>
        {s && (
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="default" size="sm" className="inline-flex items-center gap-1">
              <Bot className="h-3 w-3" />
              Bot posts: {s.botPostCount}
            </Badge>
            <Badge variant="info" size="sm">
              Total SHORT posts: {s.totalLocalpulsePosts}
            </Badge>
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="autogen">Auto-generation</TabsTrigger>
          <TabsTrigger value="manual">Manual generate</TabsTrigger>
        </TabsList>

        <TabsContent value="autogen">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-fuchsia-500" />
                Auto-generate LocalPulse posts
              </CardTitle>
              <CardDescription>
                When enabled, the app generates AI LocalPulse posts for a user's
                location whenever their location is updated — but only when there
                isn't enough local content yet. Turn this off once real users
                start posting.
              </CardDescription>
            </CardHeader>
              <CardContent className="space-y-5">
                <div className="p-4 rounded-xl bg-muted/40 border border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-start gap-3">
                    {enabled ? (
                      <ToggleRight className="h-6 w-6 text-success" />
                    ) : (
                      <ToggleLeft className="h-6 w-6 text-muted-foreground" />
                    )}
                    <div>
                      <p className="text-sm font-semibold">
                        {enabled ? "Enabled" : "Disabled"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {enabled
                          ? "AI posts will be generated for locations with low content."
                          : "No AI posts will be generated automatically."}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant={enabled ? "danger" : "primary"}
                    size="sm"
                    onClick={() => handleToggle(!enabled)}
                    disabled={updateSettings.isPending}
                  >
                    {enabled ? "Disable" : "Enable"}
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Max posts generated per location"
                    type="number"
                    min={1}
                    max={10}
                    value={maxPerLocation}
                    onChange={(e) => setMaxPerLocation(Number(e.target.value) || 1)}
                    helperText="How many AI posts to create each time (1–10)"
                  />
                  <Input
                    label="Min nearby posts before triggering"
                    type="number"
                    min={0}
                    max={50}
                    value={minNearbyPosts}
                    onChange={(e) => setMinNearbyPosts(Number(e.target.value) || 0)}
                    helperText="Only generate when nearby posts are fewer than this (within 25 km)"
                  />
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSaveNumbers} loading={updateSettings.isPending}>
                    Save settings
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="h-4 w-4 text-info" />
                  How it works
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>
                  1. A user opens the app and their location is captured (every 5 min or on tab focus).
                </p>
                <p>
                  2. If auto-generation is <b>enabled</b> and there are fewer than <b>{minNearbyPosts} posts</b> within 25 km, the AI generates up to <b>{maxPerLocation} post(s)</b>.
                </p>
                <p>
                  3. Posts are authored by the <b>LocalPulse AI</b> bot, tagged with the user's coordinates so they appear in the nearby feed.
                </p>
                <p>
                  4. Content is non-controversial, funny/informative/interesting, aimed at ages 10–30. Images use portrait reel format.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="manual">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Wand2 className="h-4 w-4 text-fuchsia-500" />
                Generate posts for a location
              </CardTitle>
              <CardDescription>
                Manually create AI LocalPulse posts for any coordinates. Useful for
                seeding a new area.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Latitude"
                  placeholder="e.g. 18.6761"
                  value={genLat}
                  onChange={(e) => setGenLat(e.target.value)}
                />
                <Input
                  label="Longitude"
                  placeholder="e.g. 73.8360"
                  value={genLng}
                  onChange={(e) => setGenLng(e.target.value)}
                />
                <Input
                  label="City / area name (optional)"
                  placeholder="e.g. Pune"
                  value={genCity}
                  onChange={(e) => setGenCity(e.target.value)}
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                <div className="sm:w-32">
                  <Input
                    label="Count"
                    type="number"
                    min={1}
                    max={10}
                    value={genCount}
                    onChange={(e) => setGenCount(Number(e.target.value) || 1)}
                  />
                </div>
                <Button variant="outline" onClick={handleUseMyLocation} className="sm:mb-0 mb-2">
                  <MapPin className="h-4 w-4 mr-1" />
                  Use my location
                </Button>
                <Button onClick={handleGenerate} loading={genLoading || generateMut.isPending} className="sm:mb-0">
                  <Wand2 className="h-4 w-4 mr-1" />
                  Generate {genCount} post{genCount > 1 ? "s" : ""}
                </Button>
              </div>

              {genResult.length > 0 && (
                <div className="space-y-2 pt-2">
                  <p className="text-sm font-semibold">Generated posts:</p>
                  {genResult.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border"
                    >
                      <div className="h-10 w-10 rounded-lg bg-fuchsia-500/15 border border-fuchsia-500/20 flex items-center justify-center flex-shrink-0">
                        <ImageIcon className="h-4 w-4 text-fuchsia-500" />
                      </div>
                      <p className="text-sm flex-1 truncate">{p.caption}</p>
                      <a
                        href={`/post/${p.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-primary hover:underline flex items-center gap-1 flex-shrink-0"
                      >
                        View <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
