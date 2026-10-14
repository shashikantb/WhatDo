"use client";

import * as React from "react";
import { useState } from "react";
import { Modal } from "@/components/design-system/Modal";
import { Button } from "@/components/design-system/Button";
import { Badge } from "@/components/design-system/Badge";
import { trpc } from "@/lib/trpc/client";
import { useToast } from "@/components/design-system/Toaster";
import { Calendar, Clock, Loader2, CheckCircle2 } from "lucide-react";

interface BookAppointmentModalProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  businessUsername: string;
  businessName: string | null;
}

export function BookAppointmentModal({
  open,
  onClose,
  businessId,
  businessUsername,
  businessName,
}: BookAppointmentModalProps) {
  const { show } = useToast();
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [resourceId, setResourceId] = useState<string | null>(null);
  const [date, setDate] = useState<string>("");
  const [time, setTime] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [done, setDone] = useState(false);

  const biz = trpc.business.getByUsername.useQuery(
    { username: businessUsername },
    { enabled: open },
  );
  const book = trpc.appointments.book.useMutation();

  const services = biz.data?.businessServices ?? [];
  const resources = biz.data?.businessResources ?? [];
  const selectedService = services.find((s) => s.id === serviceId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceId || !date || !time || !selectedService) {
      show("Please select a service, date, and time.", "danger");
      return;
    }
    const startTime = new Date(`${date}T${time}`);
    try {
      await book.mutateAsync({
        businessId,
        serviceId,
        resourceId: resourceId ?? null,
        startTime,
        notes: notes || null,
      });
      setDone(true);
      show("Appointment booked successfully!", "success");
    } catch (err: any) {
      show(err?.message ?? "Failed to book appointment.", "danger");
    }
  };

  const handleClose = () => {
    setServiceId(null);
    setResourceId(null);
    setDate("");
    setTime("");
    setNotes("");
    setDone(false);
    onClose();
  };

  // Disable past dates.
  const today = new Date().toISOString().split("T")[0];

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={done ? "Booking Confirmed" : `Book Appointment — ${businessName ?? businessUsername}`}
      description={
        done
          ? "Your appointment has been booked. The business will be notified."
          : "Choose a service and a time that works for you."
      }
    >
      {done ? (
        <div className="flex flex-col items-center text-center py-6 space-y-4">
          <CheckCircle2 className="h-12 w-12 text-success" />
          <div>
            <p className="font-semibold">Appointment Booked</p>
            <p className="text-sm text-muted-foreground mt-1">
              {selectedService?.name} on {date} at {time}
            </p>
          </div>
          <Button variant="primary" onClick={handleClose}>
            Done
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {biz.isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading services...
            </div>
          ) : services.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              This business has no active services available.
            </p>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Service</label>
                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                  {services.map((s) => (
                    <button
                      type="button"
                      key={s.id}
                      onClick={() => setServiceId(s.id)}
                      className={`text-left rounded-lg border p-3 transition-colors ${
                        serviceId === s.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{s.name}</span>
                        {s.price != null ? (
                          <Badge variant="info" size="sm">₹{s.price.toString()}</Badge>
                        ) : null}
                      </div>
                      {s.description && (
                        <p className="text-xs text-muted-foreground mt-1">{s.description}</p>
                      )}
                      {s.durationMinutes ? (
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {s.durationMinutes} min
                        </p>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>

              {resources.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Resource (optional)</label>
                  <select
                    value={resourceId ?? ""}
                    onChange={(e) => setResourceId(e.target.value || null)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Any</option>
                    {resources.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-1">
                    <Calendar className="h-4 w-4" /> Date
                  </label>
                  <input
                    type="date"
                    min={today}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-1">
                    <Clock className="h-4 w-4" /> Time
                  </label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value.slice(0, 500))}
                  rows={2}
                  placeholder="Any special requests..."
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="default" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  loading={book.isPending}
                  disabled={!serviceId || !date || !time}
                >
                  Confirm Booking
                </Button>
              </div>
            </>
          )}
        </form>
      )}
    </Modal>
  );
}
