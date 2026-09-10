"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/design-system/Button";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        console.error("Global error:", error);
      } catch {}
    }
  }, [error]);

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div
        className="absolute inset-0 opacity-50"
        style={{
          background:
            "radial-gradient(ellipse at 30% 30%, rgba(239,68,68,0.15), transparent 50%), radial-gradient(ellipse at 70% 70%, rgba(99,102,241,0.15), transparent 50%)",
        }}
      />
      <div className="relative z-10 max-w-xl mx-auto px-6 py-16 text-center">
        <div className="mb-8 inline-flex">
          <div className="h-20 w-20 rounded-2xl bg-danger/15 text-danger flex items-center justify-center border border-danger/20">
            <AlertTriangle className="h-10 w-10" strokeWidth={2} />
          </div>
        </div>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground mb-3">
          Oops, something went wrong.
        </h2>
        <p className="text-muted-foreground text-base md:text-lg mb-10 max-w-md mx-auto">
          We hit an unexpected bump. You can try again or head back home.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button size="lg" onClick={() => reset()}>
            <RefreshCw className="h-5 w-5 mr-2" />
            Try again
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link href="/feed">
              <Home className="h-5 w-5 mr-2" />
              Back Home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
