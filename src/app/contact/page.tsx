"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/design-system/Input";
import { Textarea } from "@/components/design-system/Textarea";
import { Select } from "@/components/design-system/Select";
import { Button } from "@/components/design-system/Button";
import { Card } from "@/components/design-system/Card";
import { Mail, Send, MessageSquareHeart, CheckCircle } from "lucide-react";
import { useToast } from "@/components/design-system/Toaster";

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(80),
  email: z.string().email("Enter a valid email address"),
  reason: z.enum(["Support", "Bug", "Partnership", "Press", "Other"], {
    required_error: "Please select a reason",
  }),
  message: z.string().min(10, "Message must be at least 10 characters").max(5000),
});

type FormValues = z.infer<typeof schema>;

const REASON_OPTIONS = [
  { value: "Support", label: "Support / Help using WHATDO" },
  { value: "Bug", label: "Bug report" },
  { value: "Partnership", label: "Partnership / Collaboration" },
  { value: "Press", label: "Press / Media inquiry" },
  { value: "Other", label: "Other" },
];

export default function ContactPage() {
  const { show } = useToast();
  const [sent, setSent] = React.useState(false);

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      email: "",
      reason: "Support",
      message: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      const mailto = `mailto:hello@whatdo.app?subject=${encodeURIComponent(
        `[${values.reason}] Contact from ${values.name}`
      )}&body=${encodeURIComponent(
        `Name: ${values.name}\nEmail: ${values.email}\nReason: ${values.reason}\n\nMessage:\n${values.message}`
      )}`;
      if (typeof window !== "undefined") {
        try {
          window.location.href = mailto;
        } catch {
          /* no-op */
        }
      }
      show("Thanks! We'll get back to you soon.", "success");
      setSent(true);
      reset();
      setTimeout(() => setSent(false), 60000);
    } catch {
      show("Something went wrong. Please email hello@whatdo.app directly.", "danger");
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 md:py-16">
      <div className="text-center mb-10">
        <div className="inline-flex mb-5">
          <div className="h-14 w-14 rounded-2xl bg-primary/15 text-primary flex items-center justify-center border border-primary/20">
            <MessageSquareHeart className="h-7 w-7" />
          </div>
        </div>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-foreground mb-3">
          Get in touch
        </h1>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Questions, bugs, partnerships, or press — we&apos;d love to hear from you. We usually reply within
          a business day or two.
        </p>
      </div>

      <Card className="p-6 md:p-8">
        {sent ? (
          <div className="py-10 text-center">
            <CheckCircle className="h-16 w-16 text-success mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">Message queued</h2>
            <p className="text-muted-foreground text-sm">
              Your email client should have opened with the message. If not, drop us a line at
              <a href="mailto:hello@whatdo.app" className="text-primary underline ml-1">hello@whatdo.app</a>.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Your name</label>
                <Input
                  placeholder="Alex Johnson"
                  variant={errors.name ? "error" : "default"}
                  helperText={errors.name?.message}
                  {...register("name")}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  variant={errors.email ? "error" : "default"}
                  helperText={errors.email?.message}
                  {...register("email")}
                />
              </div>
            </div>

            <div>
              <Controller
                name="reason"
                control={control}
                render={({ field }) => (
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">
                      Reason for contact
                    </label>
                    <Select
                      options={REASON_OPTIONS}
                      value={field.value}
                      onChange={(v) => field.onChange(v)}
                      error={!!errors.reason}
                      helperText={errors.reason?.message}
                    />
                  </div>
                )}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Message</label>
              <Textarea
                rows={6}
                placeholder="Tell us what's on your mind..."
                variant={errors.message ? "error" : "default"}
                helperText={errors.message?.message}
                {...register("message")}
              />
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <a
                href="mailto:hello@whatdo.app"
                className="inline-flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <Mail className="h-4 w-4" />
                hello@whatdo.app
              </a>
              <Button
                type="submit"
                size="lg"
                loading={isSubmitting}
                disabled={isSubmitting}
                className="w-full sm:w-auto"
              >
                <Send className="h-4 w-4 mr-2" />
                Send message
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
