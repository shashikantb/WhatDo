"use client";

import * as React from "react";
import { Flag, CheckCircle2 } from "lucide-react";
import { Modal } from "@/components/design-system/Modal";
import { Button } from "@/components/design-system/Button";
import { Select } from "@/components/design-system/Select";
import { Textarea } from "@/components/design-system/Textarea";
import { useToast } from "@/components/design-system/Toaster";
import { trpc } from "@/lib/trpc/client";

export type ReportTargetType = "POST" | "COMMENT" | "USER";

export const REPORT_REASONS = [
  { value: "SPAM", label: "Spam or misleading" },
  { value: "HARASSMENT", label: "Harassment or bullying" },
  { value: "HATE", label: "Hate speech or discrimination" },
  { value: "NUDITY", label: "Nudity or explicit content" },
  { value: "VIOLENCE", label: "Violence or threats" },
  { value: "SCAM", label: "Scam, fraud, or phishing" },
  { value: "MISINFO", label: "Misinformation or disinformation" },
  { value: "COPYRIGHT", label: "Copyright or IP infringement" },
  { value: "OTHER", label: "Other" },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]["value"];

export interface ReportDialogProps {
  open: boolean;
  onClose: () => void;
  targetType?: ReportTargetType;
  targetId: string;
  autoDetectType?: ReportTargetType;
}

const REPORTED_KEY = "wd:reportedTargets";

function readReportedSet(): Set<string> {
  try {
    const raw = sessionStorage.getItem(REPORTED_KEY);
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch {
  }
  return new Set();
}

function writeReportedSet(set: Set<string>) {
  try {
    sessionStorage.setItem(REPORTED_KEY, JSON.stringify(Array.from(set)));
  } catch {
  }
}

export function isTargetReported(type: ReportTargetType, id: string): boolean {
  return readReportedSet().has(`${type}:${id}`);
}

export const ReportDialog: React.FC<ReportDialogProps> = ({
  open,
  onClose,
  targetType,
  targetId,
  autoDetectType,
}) => {
  const [selectedReason, setSelectedReason] = React.useState<string>("");
  const [details, setDetails] = React.useState("");
  const { show } = useToast();

  const resolvedType = targetType ?? autoDetectType ?? "POST";
  const reportedKey = `${resolvedType}:${targetId}`;

  const createReport = trpc.reports.createReport.useMutation({
    onSuccess: () => {
      const set = readReportedSet();
      set.add(reportedKey);
      writeReportedSet(set);
      show("Thanks. Report submitted. Moderators will review.", "success");
    },
    onError: (err) => {
      if (/duplicate|already.*report/i.test(err.message)) {
        const set = readReportedSet();
        set.add(reportedKey);
        writeReportedSet(set);
        show("Thanks. Report submitted. Moderators will review.", "success");
        return;
      }
      show(`Failed to submit report: ${err.message}`, "danger");
    },
    onSettled: async () => {
      onClose();
    },
  });

  const targetLabels: Record<ReportTargetType, string> = {
    POST: "this post",
    COMMENT: "this comment",
    USER: "this user",
  };

  React.useEffect(() => {
    if (!open) {
      setSelectedReason("");
      setDetails("");
    }
  }, [open]);

  const optimisticReported = isTargetReported(resolvedType, targetId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReason) {
      show("Please select a reason for reporting", "warning");
      return;
    }

    let payload: any;
    switch (resolvedType) {
      case "POST":
        payload = {
          type: "POST",
          reportedPostId: targetId,
          reason: selectedReason as ReportReason,
          details: details || undefined,
        };
        break;
      case "COMMENT":
        payload = {
          type: "COMMENT",
          reportedCommentId: targetId,
          reason: selectedReason as ReportReason,
          details: details || undefined,
        };
        break;
      case "USER":
        payload = {
          type: "USER",
          reportedUserId: targetId,
          reason: selectedReason as ReportReason,
          details: details || undefined,
        };
        break;
    }

    createReport.mutate(payload);
  };

  const isLoading = createReport.isPending;

  if (optimisticReported && open) {
    return (
      <Modal
        open={open}
        onClose={onClose}
        title={`Report ${targetLabels[resolvedType]}`}
        size="md"
        footer={
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        }
      >
        <div className="flex flex-col items-center text-center py-8 gap-3">
          <div className="h-16 w-16 rounded-full bg-success/15 border border-success/30 flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-success" />
          </div>
          <h3 className="text-lg font-semibold">Thanks. Report submitted. Moderators will review.</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Your report for {targetLabels[resolvedType]} is being held for moderation review. You can't re-submit another report for the same target at this time.
          </p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Report ${targetLabels[resolvedType]}`}
      description="Help us keep WHATDO safe by reporting content that violates our community guidelines."
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleSubmit}
            loading={isLoading}
            type="submit"
          >
            Submit Report
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="flex items-start gap-3 p-4 rounded-lg bg-danger/5 border border-danger/15">
          <Flag className="h-5 w-5 text-danger flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-foreground">
              Reporting {targetLabels[resolvedType]}
            </p>
            <p className="text-muted-foreground mt-0.5">
              All reports are anonymous and reviewed by our moderation team.
            </p>
          </div>
        </div>

        <Select
          label="Reason for reporting"
          value={selectedReason}
          onChange={setSelectedReason}
          options={REPORT_REASONS.map((r) => ({ value: r.value, label: r.label }))}
          placeholder="Select a reason..."
          error={!selectedReason && selectedReason !== ""}
        />

        <Textarea
          label="Additional details (optional)"
          placeholder="Provide any additional context that will help our team review this report..."
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          rows={4}
          helperText={`${details.length}/1000 characters`}
        />

        <p className="text-xs text-muted-foreground">
          By submitting this report, you agree that the information provided is
          accurate and you understand that false reports may result in account
          restrictions.
        </p>
      </form>
    </Modal>
  );
};
