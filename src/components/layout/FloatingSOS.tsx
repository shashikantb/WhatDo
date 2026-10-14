"use client";

import * as React from "react";
import { Siren } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { trpc } from "@/lib/trpc/client";
import { useToast } from "@/components/design-system/Toaster";

export const FloatingSOS: React.FC = () => {
  const router = useRouter();
  const { status } = useSession();
  const isAuthed = status === "authenticated";
  const toast = useToast();
  const [pulsing, setPulsing] = React.useState(false);

  const sos = trpc.family.sos.useMutation({
    onSuccess: (data) => {
      toast.show(`SOS sent to ${data.notified} family member(s)!`, "danger");
      setPulsing(false);
    },
    onError: (err) => {
      if (err.message?.includes("No family members")) {
        toast.show("Add family members first to use SOS", "warning");
        router.push("/family");
      } else {
        toast.show(err.message || "Failed to send SOS", "danger");
      }
      setPulsing(false);
    },
  });

  const handleSOS = () => {
    if (!isAuthed) {
      router.push("/family");
      return;
    }
    if (!window.confirm("Send an SOS alert with your current location to all family members?")) return;
    setPulsing(true);
    sos.mutate({});
  };

  if (!isAuthed) return null;

  return (
    <button
      type="button"
      onClick={handleSOS}
      disabled={sos.isPending}
      className="fixed bottom-24 right-4 z-40 md:bottom-6 md:right-6 flex items-center justify-center h-14 w-14 rounded-full bg-danger text-white shadow-lg shadow-danger/40 hover:bg-danger/90 active:scale-95 transition-all duration-200"
      aria-label="Send SOS alert to family"
      title="SOS - Alert family with your location"
    >
      <span
        className={`absolute inset-0 rounded-full bg-danger ${pulsing ? "animate-ping" : "opacity-0"}`}
      />
      <Siren className={`h-6 w-6 relative ${pulsing ? "animate-pulse" : ""}`} />
    </button>
  );
};

export default FloatingSOS;
