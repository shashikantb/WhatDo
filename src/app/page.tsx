"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useLoginModal } from "@/components/auth/LoginModal";
import { Button } from "@/components/design-system/Button";
import { Card, CardContent } from "@/components/design-system/Card";
import { Badge } from "@/components/design-system/Badge";
import { SkeletonCard } from "@/components/design-system/Skeleton";
import { PostCard } from "@/components/feed/PostCard";
import { trpc } from "@/lib/trpc/client";
import {
  Sparkles,
  MessageCircleQuestion,
  Vote,
  BarChart3,
  Shield,
  ChevronRight,
  HelpCircle,
  Flame,
  Globe2,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

function HeroShine() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute top-0 left-1/4 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-3xl opacity-40" />
      <div className="absolute bottom-0 right-1/4 h-[500px] w-[500px] translate-x-1/2 translate-y-1/2 rounded-full bg-accent/20 blur-3xl opacity-40" />
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      />
    </div>
  );
}

const FEATURES = [
  {
    icon: Vote,
    title: "Cast Your Vote",
    description:
      "Quickly weigh in on thousands of questions. Swipe, tap, and share your opinion in seconds.",
    gradient: "from-violet-500/20 via-purple-500/10 to-fuchsia-500/20",
    iconColor: "text-violet-500",
  },
  {
    icon: BarChart3,
    title: "See Real Results",
    description:
      "Instantly see how the community voted. Beautiful breakdowns by demographics and interests.",
    gradient: "from-emerald-500/20 via-teal-500/10 to-green-500/20",
    iconColor: "text-emerald-500",
  },
  {
    icon: Globe2,
    title: "Follow Communities",
    description:
      "Dive into categories you love — from AI to startups to fashion to gaming and beyond.",
    gradient: "from-sky-500/20 via-cyan-500/10 to-blue-500/20",
    iconColor: "text-sky-500",
  },
  {
    icon: Shield,
    title: "Your Privacy First",
    description:
      "Vote anonymously when you want. Your opinions belong to you.",
    gradient: "from-amber-500/20 via-orange-500/10 to-yellow-500/20",
    iconColor: "text-amber-500",
  },
];

const FAQS = [
  {
    q: "What is WHATDO?",
    a: "WHATDO is the opinion-first social platform. Ask any question, let the community vote, and see real-time results on what people actually think.",
  },
  {
    q: "Is WHATDO free to use?",
    a: "Yes! WHATDO is free. Browse opinions, vote, and post your own questions without paying anything.",
  },
  {
    q: "Can I vote anonymously?",
    a: "Absolutely. Any post can be voted anonymously, and you can even post your own questions incognito.",
  },
  {
    q: "How do trending questions work?",
    a: "Trending is driven by a combination of votes, comments, shares, and recency. The hottest questions rise to the top automatically.",
  },
];

const SAMPLE_POSTS = [
  {
    id: "sample-1",
    type: "YES_NO",
    question: "Should AI-generated content be labeled clearly on social media?",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3),
    voteCount: 12847,
    commentCount: 342,
    likeCount: 587,
    saveCount: 192,
    shareCount: 84,
    isAnonymous: false,
    isClosed: false,
    category: {
      id: "cat-ai",
      name: "AI",
      slug: "ai",
      icon: "🤖",
      color: "#8B5CF6",
    },
    creator: {
      id: "u-1",
      username: "techthinker",
      displayName: "Tech Thinker",
      avatarUrl: null,
      isVerified: true,
    },
    tags: [],
    options: [
      { id: "o1", label: "Yes", voteCount: 8942, color: "#10B981" },
      { id: "o2", label: "No", voteCount: 3905, color: "#EF4444" },
    ],
    media: [],
    userVote: null,
    userLiked: false,
    userSaved: false,
  },
  {
    id: "sample-2",
    type: "MULTIPLE_CHOICE",
    question: "Which do you prefer for building apps in 2025?",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 8),
    voteCount: 7241,
    commentCount: 189,
    likeCount: 231,
    saveCount: 87,
    shareCount: 34,
    isAnonymous: false,
    isClosed: false,
    category: {
      id: "cat-tech",
      name: "Technology",
      slug: "technology",
      icon: "💻",
      color: "#0EA5E9",
    },
    creator: {
      id: "u-2",
      username: "devlife",
      displayName: "Dev Life",
      avatarUrl: null,
      isVerified: false,
    },
    tags: [],
    options: [
      { id: "o1", label: "Next.js", voteCount: 3102, color: "#000000" },
      { id: "o2", label: "Remix", voteCount: 1054, color: "#000000" },
      { id: "o3", label: "SvelteKit", voteCount: 1835, color: "#FF3E00" },
      { id: "o4", label: "Astro", voteCount: 1250, color: "#FF5D01" },
    ],
    media: [],
    userVote: null,
    userLiked: false,
    userSaved: false,
  },
  {
    id: "sample-3",
    type: "YES_NO",
    question: "Would you work 4 days a week for 85% pay?",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12),
    voteCount: 24509,
    commentCount: 1203,
    likeCount: 1892,
    saveCount: 643,
    shareCount: 287,
    isAnonymous: false,
    isClosed: false,
    category: {
      id: "cat-biz",
      name: "Business",
      slug: "business",
      icon: "💼",
      color: "#059669",
    },
    creator: {
      id: "u-3",
      username: "careersage",
      displayName: "Career Sage",
      avatarUrl: null,
      isVerified: true,
    },
    tags: [],
    options: [
      { id: "o1", label: "Absolutely yes", voteCount: 19890, color: "#10B981" },
      { id: "o2", label: "I'd prefer 5 days full pay", voteCount: 4619, color: "#EF4444" },
    ],
    media: [],
    userVote: null,
    userLiked: false,
    userSaved: false,
  },
];

export default function Home() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { openLogin } = useLoginModal();
  const isAuthenticated = status === "authenticated";
  const [openFaq, setOpenFaq] = React.useState<number | null>(0);

  const trendingQuery = trpc.feed.getTrending.useQuery(
    { timeRange: "24h", limit: 3 },
    {
      staleTime: 60_000,
      enabled: !isAuthenticated,
    },
  );

  React.useEffect(() => {
    if (isAuthenticated) {
      router.replace("/feed");
    }
  }, [isAuthenticated, router]);

  if (status === "loading") {
    return (
      <main className="min-h-screen bg-background">
        <div className="max-w-3xl mx-auto p-6 space-y-6 pt-20">
          <SkeletonCard className="h-96" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SkeletonCard className="h-40" />
            <SkeletonCard className="h-40" />
            <SkeletonCard className="h-40" />
            <SkeletonCard className="h-40" />
          </div>
        </div>
      </main>
    );
  }

  if (isAuthenticated) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-center animate-pulse">
          <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">
            Taking you to your feed...
          </p>
        </div>
      </main>
    );
  }

  const trendingPosts = trendingQuery.data ?? [];
  const hasTrending = trendingPosts.length >= 3;
  const displayPosts = hasTrending ? trendingPosts : SAMPLE_POSTS;

  return (
    <main className="relative bg-gradient-to-br from-primary/5 via-background to-accent/5 overflow-hidden">
      <HeroShine />

      <header className="relative z-10 sticky top-0 backdrop-blur-xl bg-background/70 border-b border-border/50">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-5 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
              <span className="text-white font-black text-lg">W</span>
            </div>
            <span className="font-black text-xl tracking-tight bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              WHATDO
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            <Link
              href="/trending"
              className="px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              Trending
            </Link>
            <Link
              href="/discover"
              className="px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              Discover
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openLogin()}
            >
              Sign in
            </Button>
            <Button
              size="sm"
              onClick={() => openLogin()}
              rightIcon={<ChevronRight className="h-4 w-4" />}
            >
              Get started
            </Button>
          </div>
        </div>
      </header>

      <section className="relative z-10 pt-20 pb-24 px-5">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 backdrop-blur px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-sm">
            <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            The opinion platform for everyone
          </div>

          <div className="space-y-5">
            <h1 className="font-black tracking-tight text-5xl sm:text-6xl md:text-7xl leading-[1.05]">
              <span className="bg-gradient-to-r from-primary via-fuchsia-500 to-accent bg-clip-text text-transparent">
                SEE IT.
              </span>{" "}
              <span className="bg-gradient-to-r from-accent via-primary to-fuchsia-500 bg-clip-text text-transparent">
                VOTE IT.
              </span>
              <br />
              <span className="bg-gradient-to-r from-fuchsia-500 via-primary to-accent bg-clip-text text-transparent">
                KNOW WHAT PEOPLE THINK.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Post a question. Watch thousands vote. See real-time results on
              everything from tech to food to life&apos;s biggest decisions.
              Opinions you can actually count.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <Button
              size="lg"
              onClick={() => router.push("/feed")}
              rightIcon={<ChevronRight className="h-5 w-5" />}
              className="px-8 shadow-xl shadow-primary/20 hover:shadow-2xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all"
            >
              Start Exploring
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => openLogin({ type: "create_post" })}
              leftIcon={<MessageCircleQuestion className="h-5 w-5" />}
              className="px-8 border-2 hover:-translate-y-0.5 transition-all"
            >
              Ask People
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-amber-500" />
              No credit card required
            </span>
            <span className="h-1 w-1 rounded-full bg-border" />
            <span>Vote in seconds</span>
            <span className="h-1 w-1 rounded-full bg-border" />
            <span>Anonymous mode available</span>
          </div>
        </div>
      </section>

      <section className="relative z-10 px-5 pb-20">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-warning" />
              <h2 className="text-lg font-semibold tracking-tight">
                Trending questions right now
              </h2>
            </div>
            <Link
              href="/trending"
              className="text-sm font-medium text-primary hover:underline flex items-center gap-0.5"
            >
              View all <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="space-y-4">
            {displayPosts.map((post: any, idx: number) => (
              <div
                key={post.id}
                className={cn(
                  "transition-all duration-200",
                  idx === 0 && "md:-mx-4 md:scale-[1.02]",
                )}
              >
                <PostCard
                  post={post}
                  index={idx}
                  onClick={(p) => router.push(`/post/${p.id}`)}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 px-5 pb-24">
        <div className="max-w-6xl mx-auto space-y-10">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <Badge variant="default" size="sm" className="bg-primary/10 text-primary border-primary/30">
              Features
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
              Why people love{" "}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                WHATDO
              </span>
            </h2>
            <p className="text-muted-foreground">
              Everything you need to tap into the pulse of public opinion.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <Card key={i} className="overflow-hidden group hover:shadow-elevated transition-all duration-200 hover:-translate-y-0.5">
                  <CardContent
                    className={cn(
                      "p-6 space-y-3 bg-gradient-to-br",
                      f.gradient,
                    )}
                  >
                    <div className="h-12 w-12 rounded-xl bg-card/80 backdrop-blur flex items-center justify-center shadow-sm">
                      <Icon className={cn("h-6 w-6", f.iconColor)} />
                    </div>
                    <h3 className="font-bold text-lg text-foreground">
                      {f.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {f.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section className="relative z-10 px-5 pb-24">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="text-center space-y-3">
            <Badge variant="default" size="sm" className="bg-info/10 text-info border-info/30">
              FAQ
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
              Frequently asked questions
            </h2>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, i) => {
              const isOpen = openFaq === i;
              return (
                <Card
                  key={i}
                  className="overflow-hidden cursor-pointer hover:border-primary/30 transition-colors"
                  onClick={() => setOpenFaq(isOpen ? null : i)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                        <HelpCircle className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-start justify-between gap-3">
                          <p className="font-semibold text-foreground text-sm md:text-base">
                            {faq.q}
                          </p>
                          <ChevronRight
                            className={cn(
                              "h-5 w-5 flex-shrink-0 text-muted-foreground transition-transform duration-200",
                              isOpen && "rotate-90",
                            )}
                          />
                        </div>
                        {isOpen && (
                          <p className="text-sm text-muted-foreground leading-relaxed pt-1 animate-fadeIn">
                            {faq.a}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section className="relative z-10 px-5 pb-20">
        <div className="max-w-4xl mx-auto">
          <Card className="overflow-hidden border-0 bg-gradient-to-br from-primary/10 via-accent/10 to-primary/5">
            <CardContent className="p-8 md:p-12 text-center space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-background/60 backdrop-blur px-4 py-1.5 text-xs font-bold text-primary uppercase tracking-wider">
                <Zap className="h-3.5 w-3.5" />
                Join millions today
              </div>
              <h3 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight">
                Ready to see what people really think?
              </h3>
              <p className="text-muted-foreground max-w-lg mx-auto">
                Create a free account in 20 seconds. Start asking, voting, and
                discovering what the world actually wants.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <Button
                  size="lg"
                  onClick={() => openLogin()}
                  rightIcon={<ChevronRight className="h-5 w-5" />}
                  className="px-8 shadow-xl shadow-primary/20"
                >
                  Get started — it&apos;s free
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => router.push("/feed")}
                  className="px-8"
                >
                  Continue browsing
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <footer className="relative z-10 border-t border-border/50 bg-background/60 backdrop-blur px-5 py-10">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8">
            <div className="space-y-3 max-w-sm">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-sm">
                  <span className="text-white font-black text-sm">W</span>
                </div>
                <span className="font-black text-lg tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  WHATDO
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                The opinion-first social platform. Post, vote, know what people think.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 text-sm">
              <div className="space-y-2.5">
                <p className="font-semibold text-foreground">Product</p>
                <div className="space-y-2">
                  <Link href="/feed" className="block text-muted-foreground hover:text-foreground transition-colors">Feed</Link>
                  <Link href="/trending" className="block text-muted-foreground hover:text-foreground transition-colors">Trending</Link>
                  <Link href="/discover" className="block text-muted-foreground hover:text-foreground transition-colors">Discover</Link>
                  <Link href="/ask" className="block text-muted-foreground hover:text-foreground transition-colors">Ask question</Link>
                </div>
              </div>
              <div className="space-y-2.5">
                <p className="font-semibold text-foreground">Company</p>
                <div className="space-y-2">
                  <Link href="/about" className="block text-muted-foreground hover:text-foreground transition-colors">About</Link>
                  <Link href="/contact" className="block text-muted-foreground hover:text-foreground transition-colors">Contact</Link>
                  <Link href="/careers" className="block text-muted-foreground hover:text-foreground transition-colors">Careers</Link>
                  <Link href="/press" className="block text-muted-foreground hover:text-foreground transition-colors">Press</Link>
                </div>
              </div>
              <div className="space-y-2.5">
                <p className="font-semibold text-foreground">Legal</p>
                <div className="space-y-2">
                  <Link href="/terms" className="block text-muted-foreground hover:text-foreground transition-colors">Terms</Link>
                  <Link href="/privacy" className="block text-muted-foreground hover:text-foreground transition-colors">Privacy</Link>
                  <Link href="/cookies" className="block text-muted-foreground hover:text-foreground transition-colors">Cookies</Link>
                </div>
              </div>
              <div className="space-y-2.5">
                <p className="font-semibold text-foreground">Support</p>
                <div className="space-y-2">
                  <Link href="/help" className="block text-muted-foreground hover:text-foreground transition-colors">Help Center</Link>
                  <Link href="/community" className="block text-muted-foreground hover:text-foreground transition-colors">Community</Link>
                  <Link href="/guidelines" className="block text-muted-foreground hover:text-foreground transition-colors">Guidelines</Link>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-border/50 pt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-muted-foreground">
            <p>© {new Date().getFullYear()} WHATDO. All rights reserved.</p>
            <p className="flex items-center gap-1.5">
              Made with <span className="text-rose-500">♥</span> for curious minds
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
