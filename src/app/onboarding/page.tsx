"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Sparkles, ChevronRight } from "lucide-react";
import {
  Cpu,
  Bot,
  Rocket,
  Briefcase,
  DollarSign,
  Shirt,
  UtensilsCrossed,
  Plane,
  Car,
  Film,
  Music,
  Gamepad2,
  Trophy,
  Palette,
  Heart,
  GraduationCap,
  Building2,
  ShoppingBag,
  Laugh,
  Shuffle,
  Zap,
} from "lucide-react";

const CATEGORIES = [
  { slug: "technology", name: "Technology", icon: Cpu, color: "#3B82F6" },
  { slug: "ai", name: "AI", icon: Bot, color: "#8B5CF6" },
  { slug: "startups", name: "Startups", icon: Rocket, color: "#F59E0B" },
  { slug: "business", name: "Business", icon: Briefcase, color: "#10B981" },
  { slug: "money", name: "Money", icon: DollarSign, color: "#059669" },
  { slug: "fashion", name: "Fashion", icon: Shirt, color: "#EC4899" },
  { slug: "food", name: "Food", icon: UtensilsCrossed, color: "#EF4444" },
  { slug: "travel", name: "Travel", icon: Plane, color: "#06B6D4" },
  { slug: "cars", name: "Cars", icon: Car, color: "#6366F1" },
  { slug: "movies", name: "Movies", icon: Film, color: "#DC2626" },
  { slug: "music", name: "Music", icon: Music, color: "#A855F7" },
  { slug: "gaming", name: "Gaming", icon: Gamepad2, color: "#22C55E" },
  { slug: "sports", name: "Sports", icon: Trophy, color: "#F97316" },
  { slug: "design", name: "Design", icon: Palette, color: "#E11D48" },
  {
    slug: "lifestyle",
    name: "Lifestyle",
    icon: Sparkles,
    color: "#14B8A6",
  },
  {
    slug: "relationships",
    name: "Relationships",
    icon: Heart,
    color: "#F43F5E",
  },
  {
    slug: "education",
    name: "Education",
    icon: GraduationCap,
    color: "#2563EB",
  },
  { slug: "career", name: "Career", icon: Building2, color: "#4F46E5" },
  {
    slug: "shopping",
    name: "Shopping",
    icon: ShoppingBag,
    color: "#D946EF",
  },
  { slug: "funny", name: "Funny", icon: Laugh, color: "#FBBF24" },
  { slug: "random", name: "Random", icon: Shuffle, color: "#64748B" },
  { slug: "viral", name: "Viral", icon: Zap, color: "#CA8A04" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  const toggleCategory = (slug: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      return next;
    });
  };

  const handleContinue = async () => {
    setIsSaving(true);
    try {
      const selectedSlugs = Array.from(selected);
      if (selectedSlugs.length > 0) {
        await fetch("/api/onboarding/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ categorySlugs: selectedSlugs }),
        });
      }
      router.push("/feed");
      router.refresh();
    } catch (error) {
      router.push("/feed");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = () => {
    router.push("/feed");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-violet-900/30 via-slate-950 to-fuchsia-900/20"></div>

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-3xl">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 mb-6">
              <Sparkles className="h-4 w-4 text-violet-400" />
              <span className="text-sm font-medium text-violet-300">
                Welcome aboard!
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
              What are you interested in?
            </h1>
            <p className="text-slate-400 text-lg">
              Pick categories to personalize your feed. You can change this
              anytime in settings.
            </p>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 sm:p-8 mb-8">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {CATEGORIES.map((cat) => {
                const isSelected = selected.has(cat.slug);
                const IconComp = cat.icon;
                return (
                  <button
                    key={cat.slug}
                    onClick={() => toggleCategory(cat.slug)}
                    className={`relative group flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 ${
                      isSelected
                        ? "border-violet-500 bg-violet-500/10 shadow-lg shadow-violet-500/10 scale-[1.02]"
                        : "border-slate-800 bg-slate-800/30 hover:border-slate-700 hover:bg-slate-800/60"
                    }`}
                  >
                    {isSelected && (
                      <div
                        className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: cat.color }}
                      >
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    )}
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                      style={{
                        backgroundColor: isSelected
                          ? `${cat.color}25`
                          : `${cat.color}15`,
                        border: isSelected
                          ? `1px solid ${cat.color}50`
                          : "1px solid transparent",
                      }}
                    >
                      <IconComp
                        className="h-5 w-5"
                        style={{ color: cat.color }}
                      />
                    </div>
                    <span
                      className={`text-sm font-medium ${
                        isSelected ? "text-white" : "text-slate-300"
                      }`}
                    >
                      {cat.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-slate-500">
              {selected.size > 0 ? (
                <span className="text-slate-400">
                  {selected.size} categor
                  {selected.size === 1 ? "y" : "ies"} selected
                </span>
              ) : (
                <span>No categories selected (optional)</span>
              )}
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={handleSkip}
                disabled={isSaving}
                className="flex-1 sm:flex-none px-6 py-3 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/50 font-medium transition-all disabled:opacity-50"
              >
                Skip for now
              </button>
              <button
                onClick={handleContinue}
                disabled={isSaving}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white font-semibold shadow-lg shadow-violet-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>
                    Continue
                    <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
