import type { Metadata } from "next";
import { Compass, Vote, Share2, Users } from "lucide-react";
import { Card } from "@/components/design-system/Card";
import { Button } from "@/components/design-system/Button";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About",
  description: "About WHATDO — discover what others think, simply.",
};

export default function AboutPage() {
  return (
    <div className="w-full">
      <section className="relative overflow-hidden py-20 md:py-28">
        <div
          className="absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(ellipse at 20% 20%, rgba(99,102,241,0.25), transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(236,72,153,0.2), transparent 50%)",
          }}
        />
        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <div className="mx-auto mb-8 h-24 w-24 rounded-3xl bg-gradient-to-br from-primary via-purple-500 to-accent shadow-elevated flex items-center justify-center">
            <span className="text-4xl font-black text-white tracking-tight">WD</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-foreground mb-4">
            WHATDO
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            WHATDO helps people quickly discover what others think.
            <span className="block mt-2 font-medium text-foreground/90">Simple.</span>
          </p>
          <div className="mt-10 flex items-center justify-center gap-3 flex-wrap">
            <Button size="lg" asChild>
              <Link href="/feed">See the feed</Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/ask">Ask something</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-16 md:py-20">
        <h2 className="text-3xl md:text-4xl font-black tracking-tight text-center mb-12">
          How WHATDO works
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="p-6 md:p-8 hover:shadow-elevated transition-shadow">
            <div className="h-12 w-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center mb-5 border border-primary/20">
              <Compass className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold tracking-tight mb-2">Discover</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Scroll an endless feed of questions, images, videos, and hot takes from people around the
              world — from AI gadgets to life decisions.
            </p>
          </Card>

          <Card className="p-6 md:p-8 hover:shadow-elevated transition-shadow">
            <div className="h-12 w-12 rounded-xl bg-accent/15 text-accent flex items-center justify-center mb-5 border border-accent/20">
              <Vote className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold tracking-tight mb-2">Opinionate</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Vote in one tap. Yes/No, A vs B, ratings, polls, emoji reactions — your say counts. See
              real-time results and where the crowd lands.
            </p>
          </Card>

          <Card className="p-6 md:p-8 hover:shadow-elevated transition-shadow">
            <div className="h-12 w-12 rounded-xl bg-purple-500/15 text-purple-500 flex items-center justify-center mb-5 border border-purple-500/20">
              <Share2 className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold tracking-tight mb-2">Share</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Post your own question in under 30 seconds. Get honest feedback from thousands, then share
              results with your friends or followers anywhere.
            </p>
          </Card>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-4 py-16 md:py-20">
        <h2 className="text-3xl md:text-4xl font-black tracking-tight text-center mb-12">
          Team
        </h2>
        <Card className="p-8 md:p-12 text-center">
          <div className="flex justify-center gap-4 mb-6">
            {["A", "B", "C", "D"].map((l, i) => (
              <div
                key={l}
                className="h-16 w-16 md:h-20 md:w-20 rounded-full bg-gradient-to-br from-primary/70 via-purple-500/70 to-accent/70 border-2 border-card flex items-center justify-center text-white font-black text-lg md:text-xl shadow-card"
                style={{ transform: `translateX(${(i - 1.5) * 8}px)` }}
              >
                {l}
              </div>
            ))}
          </div>
          <p className="text-muted-foreground text-sm">
            A small team of product engineers, designers, and community builders obsessed with one question:
            <span className="font-semibold text-foreground/90"> What do people actually think?</span>
          </p>
          <p className="text-muted-foreground/80 text-xs mt-3 flex items-center justify-center gap-2">
            <Users className="h-4 w-4" /> Distributed · Remote-first · Building in public
          </p>
        </Card>
      </section>

      <section className="max-w-4xl mx-auto px-4 py-16 md:py-20">
        <h2 className="text-3xl md:text-4xl font-black tracking-tight text-center mb-12">
          Our Story
        </h2>
        <ol className="relative border-s-2 border-primary/30 ms-4 space-y-10">
          <li className="ms-8">
            <span className="absolute -start-3 flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white text-xs font-bold ring-4 ring-background">
              1
            </span>
            <h3 className="font-bold text-foreground">2026 · Concept</h3>
            <p className="text-sm text-muted-foreground mt-1">
              What if you could get an honest answer from a thousand people in under a minute? That question
              started WHATDO — a prototype built in a weekend that got tens of thousands of votes overnight.
            </p>
          </li>
          <li className="ms-8">
            <span className="absolute -start-3 flex items-center justify-center w-6 h-6 rounded-full bg-accent text-white text-xs font-bold ring-4 ring-background">
              2
            </span>
            <h3 className="font-bold text-foreground">2026 · Launch v1</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Public launch of WHATDO v1 — with 8 question types, moderation tools, predictions, trending
              rankings, and a global community starting to form.
            </p>
          </li>
        </ol>
      </section>

      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-4 py-12 text-center">
          <div className="inline-flex items-center gap-2 mb-6">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary via-purple-500 to-accent flex items-center justify-center text-white font-black text-sm">
              WD
            </div>
            <span className="font-black tracking-tight text-lg">WHATDO</span>
          </div>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <Link href="/terms" className="hover:text-primary underline-offset-4 hover:underline">Terms</Link>
            <Link href="/privacy" className="hover:text-primary underline-offset-4 hover:underline">Privacy</Link>
            <Link href="/community-guidelines" className="hover:text-primary underline-offset-4 hover:underline">Community</Link>
            <Link href="/cookies" className="hover:text-primary underline-offset-4 hover:underline">Cookies</Link>
            <Link href="/contact" className="hover:text-primary underline-offset-4 hover:underline">Contact</Link>
          </div>
          <p className="text-xs text-muted-foreground/70 mt-6">
            © {new Date().getFullYear()} WHATDO. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
