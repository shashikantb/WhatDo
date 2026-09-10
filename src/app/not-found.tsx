import Link from "next/link";
import { Button } from "@/components/design-system/Button";
import { Home, Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div
        className="absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(ellipse at 20% 20%, rgba(99,102,241,0.25), transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(236,72,153,0.25), transparent 50%), radial-gradient(ellipse at 50% 50%, rgba(168,85,247,0.15), transparent 60%)",
        }}
      />
      <div className="relative z-10 max-w-xl mx-auto px-6 py-16 text-center">
        <div className="mb-8">
          <h1 className="text-[140px] md:text-[200px] font-black leading-none bg-gradient-to-br from-primary via-purple-500 to-accent bg-clip-text text-transparent tracking-tight select-none">
            404
          </h1>
        </div>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground mb-3">
          This page went for a walk
        </h2>
        <p className="text-muted-foreground text-base md:text-lg mb-10 max-w-md mx-auto">
          It didn&apos;t come back. The link might be broken or the page may have been moved.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button size="lg" asChild>
            <Link href="/feed">
              <Home className="h-5 w-5 mr-2" />
              Back Home
            </Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link href="/discover">
              <Compass className="h-5 w-5 mr-2" />
              Explore Feed
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
