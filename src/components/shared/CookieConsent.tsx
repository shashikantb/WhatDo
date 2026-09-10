"use client";

import * as React from "react";
import { Button } from "@/components/design-system/Button";
import { Cookie } from "lucide-react";

const COOKIE_KEY = "whatdo-cookie-consent";

type ConsentChoice = "all" | "necessary" | null;

export const CookieConsent: React.FC = () => {
  const [show, setShow] = React.useState(false);

  React.useEffect(() => {
    try {
      const stored = typeof window !== "undefined" ? localStorage.getItem(COOKIE_KEY) : null;
      if (!stored) {
        const t = setTimeout(() => setShow(true), 800);
        return () => clearTimeout(t);
      }
    } catch {}
  }, []);

  const save = (choice: Exclude<ConsentChoice, null>) => {
    try {
      localStorage.setItem(COOKIE_KEY, choice);
    } catch {}
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-[90] border-t border-border bg-card/95 backdrop-blur-xl shadow-elevated animate-slideUp">
      <div className="max-w-6xl mx-auto px-4 py-4 sm:py-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="h-10 w-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center flex-shrink-0 border border-primary/20">
            <Cookie className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-foreground mb-0.5">
              We use cookies
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              We use cookies to enhance your browsing experience, analyze site traffic, and serve personalized content.
              See our <a href="/cookies" className="underline hover:text-primary">Cookie Policy</a> for details.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto flex-shrink-0">
          <Button variant="outline" size="sm" onClick={() => save("necessary")}>
            Necessary only
          </Button>
          <Button size="sm" onClick={() => save("all")}>
            Accept all
          </Button>
        </div>
      </div>
    </div>
  );
};
