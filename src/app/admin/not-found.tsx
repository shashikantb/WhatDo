import Link from "next/link";
import { Button } from "@/components/design-system/Button";
import { Home, Shield } from "lucide-react";

export default function AdminNotFound() {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div
        className="absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(ellipse at 20% 20%, rgba(99,102,241,0.2), transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(251,146,60,0.2), transparent 50%)",
        }}
      />
      <div className="relative z-10 max-w-xl mx-auto px-6 py-16 text-center">
        <div className="mb-8 inline-flex">
          <div className="h-20 w-20 rounded-2xl bg-primary/15 text-primary flex items-center justify-center border border-primary/20">
            <Shield className="h-10 w-10" />
          </div>
        </div>
        <h1 className="text-7xl md:text-8xl font-black leading-none text-foreground mb-4 tracking-tight">
          404
        </h1>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground mb-3">
          Admin page not found
        </h2>
        <p className="text-muted-foreground text-base md:text-lg mb-10 max-w-md mx-auto">
          The admin page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button size="lg" asChild>
            <Link href="/admin">
              <Shield className="h-5 w-5 mr-2" />
              Admin Dashboard
            </Link>
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
