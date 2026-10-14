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
import { useToast } from "@/components/design-system/Toaster";
import {
  Store,
  Briefcase,
  Clock,
  Users,
  Plus,
  Trash2,
  Loader2,
  Pencil,
  Check,
  X,
  Save,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function BusinessAccountPage() {
  const { show } = useToast();
  const utils = trpc.useUtils();

  const { data: biz, isLoading } = trpc.business.getMyBusiness.useQuery();
  const updateProfile = trpc.business.updateProfile.useMutation({
    onSuccess: () => {
      show("Business profile updated.");
      utils.business.getMyBusiness.invalidate();
    },
    onError: (e) => show(`Update failed: ${e.message}`, "danger"),
  });

  // ── Profile form state ──
  const [isBusiness, setIsBusiness] = React.useState(false);
  const [businessName, setBusinessName] = React.useState("");
  const [businessCategory, setBusinessCategory] = React.useState("");
  const [businessDescription, setBusinessDescription] = React.useState("");

  React.useEffect(() => {
    if (biz) {
      setIsBusiness(biz.isBusiness);
      setBusinessName(biz.businessName ?? "");
      setBusinessCategory(biz.businessCategory ?? "");
      setBusinessDescription(biz.businessDescription ?? "");
    }
  }, [biz]);

  const handleSaveProfile = () => {
    updateProfile.mutate({
      isBusiness,
      businessName: businessName || null,
      businessCategory: businessCategory || null,
      businessDescription: businessDescription || null,
    });
  };

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-6 p-4">
        <div>
          <h1 className="text-2xl font-bold">Business Account</h1>
          <p className="text-sm text-muted-foreground">
            Manage your business profile, services, hours, and resources.
          </p>
        </div>

        {/* Business toggle + profile */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <Store className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <CardTitle>Business Profile</CardTitle>
                <CardDescription>Enable business mode to offer services and accept appointments.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="font-medium">Business mode</p>
                <p className="text-xs text-muted-foreground">Show business info on your profile and allow bookings.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsBusiness((v) => !v)}
                className={cn(
                  "relative h-6 w-11 rounded-full transition-colors",
                  isBusiness ? "bg-emerald-500" : "bg-muted",
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform",
                    isBusiness ? "translate-x-5" : "translate-x-0.5",
                  )}
                />
              </button>
            </label>

            {isBusiness && (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Business Name</label>
                  <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="e.g. Sharma Dental Clinic" />
                </div>
                <div>
                  <label className="text-sm font-medium">Category</label>
                  <Input value={businessCategory} onChange={(e) => setBusinessCategory(e.target.value)} placeholder="e.g. Healthcare, Salon, Restaurant" />
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea value={businessDescription} onChange={(e) => setBusinessDescription(e.target.value)} placeholder="Tell customers about your business..." />
                </div>
              </div>
            )}

            <Button onClick={handleSaveProfile} disabled={updateProfile.isPending} className="w-full sm:w-auto">
              {updateProfile.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Profile
            </Button>
          </CardContent>
        </Card>

        {isBusiness && (
          <>
            <ServicesSection />
            <HoursSection />
            <ResourcesSection />
          </>
        )}
      </div>
    </AppShell>
  );
}

// ───────────────────────── Services ─────────────────────────
function ServicesSection() {
  const { show } = useToast();
  const utils = trpc.useUtils();
  const { data: services } = trpc.business.listServices.useQuery();
  const createSvc = trpc.business.createService.useMutation({
    onSuccess: () => { show("Service added."); utils.business.listServices.invalidate(); },
    onError: (e) => show(`Failed: ${e.message}`, "danger"),
  });
  const deleteSvc = trpc.business.deleteService.useMutation({
    onSuccess: () => { show("Service removed."); utils.business.listServices.invalidate(); },
  });

  const [name, setName] = React.useState("");
  const [price, setPrice] = React.useState("");
  const [duration, setDuration] = React.useState("30");

  const handleAdd = () => {
    if (!name.trim()) return;
    createSvc.mutate({
      name: name.trim(),
      price: parseFloat(price) || 0,
      durationMinutes: parseInt(duration) || 30,
    });
    setName(""); setPrice(""); setDuration("30");
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-sky-500/10 flex items-center justify-center">
            <Briefcase className="h-5 w-5 text-sky-500" />
          </div>
          <div>
            <CardTitle>Services</CardTitle>
            <CardDescription>Services you offer to customers.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          <Input placeholder="Service name" value={name} onChange={(e) => setName(e.target.value)} className="sm:col-span-2" />
          <Input type="number" placeholder="Price" value={price} onChange={(e) => setPrice(e.target.value)} />
          <Input type="number" placeholder="Duration (min)" value={duration} onChange={(e) => setDuration(e.target.value)} />
        </div>
        <Button onClick={handleAdd} disabled={createSvc.isPending} size="sm">
          {createSvc.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Add Service
        </Button>

        <div className="space-y-2">
          {services?.map((svc) => (
            <div key={svc.id} className="flex items-center justify-between rounded-lg border p-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium truncate">{svc.name}</p>
                  {!svc.isActive && <Badge variant="warning" size="sm">Inactive</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">₹{svc.price.toString()} · {svc.durationMinutes} min</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => deleteSvc.mutate({ id: svc.id })} disabled={deleteSvc.isPending}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
          {services?.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No services yet. Add one above.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ───────────────────────── Hours ─────────────────────────
function HoursSection() {
  const { show } = useToast();
  const utils = trpc.useUtils();
  const { data: hours } = trpc.business.listHours.useQuery();
  const setHrs = trpc.business.setHours.useMutation({
    onSuccess: () => { show("Hours updated."); utils.business.listHours.invalidate(); },
    onError: (e) => show(`Failed: ${e.message}`, "danger"),
  });

  const byDay = React.useMemo(() => {
    const map: Record<number, any> = {};
    hours?.forEach((h) => { map[h.dayOfWeek] = h; });
    return map;
  }, [hours]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <Clock className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <CardTitle>Business Hours</CardTitle>
            <CardDescription>Set your opening hours for each day.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {DAYS.map((day, idx) => {
          const h = byDay[idx];
          const [closed, setClosed] = React.useState(h?.isClosed ?? true);
          const [start, setStart] = React.useState(h?.startTime ?? "09:00");
          const [end, setEnd] = React.useState(h?.endTime ?? "18:00");

          React.useEffect(() => {
            setClosed(h?.isClosed ?? true);
            setStart(h?.startTime ?? "09:00");
            setEnd(h?.endTime ?? "18:00");
          }, [h]);

          return (
            <div key={day} className="flex items-center gap-2 rounded-lg border p-2">
              <span className="w-24 text-sm font-medium">{day}</span>
              <label className="flex items-center gap-1 text-xs">
                <input type="checkbox" checked={closed} onChange={(e) => setClosed(e.target.checked)} />
                Closed
              </label>
              {!closed && (
                <>
                  <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="w-28" />
                  <span className="text-xs">to</span>
                  <Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="w-28" />
                </>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setHrs.mutate({ dayOfWeek: idx, startTime: start, endTime: end, isClosed: closed })}
                disabled={setHrs.isPending}
              >
                <Check className="h-4 w-4" />
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// ───────────────────────── Resources ─────────────────────────
function ResourcesSection() {
  const { show } = useToast();
  const utils = trpc.useUtils();
  const { data: resources } = trpc.business.listResources.useQuery();
  const createRes = trpc.business.createResource.useMutation({
    onSuccess: () => { show("Resource added."); utils.business.listResources.invalidate(); },
    onError: (e) => show(`Failed: ${e.message}`, "danger"),
  });
  const deleteRes = trpc.business.deleteResource.useMutation({
    onSuccess: () => { show("Resource removed."); utils.business.listResources.invalidate(); },
  });

  const [name, setName] = React.useState("");

  const handleAdd = () => {
    if (!name.trim()) return;
    createRes.mutate({ name: name.trim() });
    setName("");
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
            <Users className="h-5 w-5 text-violet-500" />
          </div>
          <div>
            <CardTitle>Resources</CardTitle>
            <CardDescription>Staff members, rooms, or equipment used for appointments.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input placeholder="Resource name (e.g. Dr. Sharma, Room 1)" value={name} onChange={(e) => setName(e.target.value)} />
          <Button onClick={handleAdd} disabled={createRes.isPending} size="sm">
            {createRes.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add
          </Button>
        </div>
        <div className="space-y-2">
          {resources?.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <p className="font-medium">{r.name}</p>
                {!r.isActive && <Badge variant="warning" size="sm">Inactive</Badge>}
              </div>
              <Button variant="ghost" size="sm" onClick={() => deleteRes.mutate({ id: r.id })} disabled={deleteRes.isPending}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
          {resources?.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No resources yet.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
