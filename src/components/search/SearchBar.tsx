"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, X, Hash, User, MessageCircle } from "lucide-react";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { UserAvatar } from "@/components/shared/UserAvatar";

export type SearchBarSize = "sm" | "md" | "lg";

export interface SearchBarProps {
  size?: SearchBarSize;
  placeholder?: string;
  onSubmit?: (query: string) => void;
  showSuggestions?: boolean;
  autoFocus?: boolean;
  className?: string;
  defaultValue?: string;
}

interface SuggestionItem {
  type: "user" | "post" | "tag" | "category";
  id: string;
  label: string;
  subLabel?: string;
  href: string;
  avatarUrl?: string | null;
  username?: string;
}

const sizeClasses: Record<SearchBarSize, string> = {
  sm: "h-9 pl-9 pr-8 text-xs",
  md: "h-10 pl-10 pr-10 text-sm",
  lg: "h-12 pl-12 pr-12 text-base",
};

const iconClasses: Record<SearchBarSize, string> = {
  sm: "left-2.5 h-4 w-4",
  md: "left-3 h-4 w-4",
  lg: "left-4 h-5 w-5",
};

const clearClasses: Record<SearchBarSize, string> = {
  sm: "right-2 h-6 w-6",
  md: "right-3 h-7 w-7",
  lg: "right-4 h-8 w-8",
};

export const SearchBar: React.FC<SearchBarProps> = ({
  size = "md",
  placeholder = "Search what people think...",
  onSubmit,
  showSuggestions = true,
  autoFocus = false,
  className,
  defaultValue = "",
}) => {
  const router = useRouter();
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";

  const [query, setQuery] = React.useState(defaultValue);
  const [isFocused, setIsFocused] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(-1);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const debounceTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedQuery, setDebouncedQuery] = React.useState(defaultValue);

  React.useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 250);
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [query]);

  const suggestionsQuery = trpc.search.suggestions.useQuery(
    { q: debouncedQuery },
    {
      enabled: showSuggestions && debouncedQuery.length >= 1,
      staleTime: 30_000,
    },
  );

  const searchQueryQuery = trpc.search.query.useQuery(
    { q: debouncedQuery, type: "all", limit: 10 },
    {
      enabled: showSuggestions && debouncedQuery.length >= 2,
      staleTime: 30_000,
    },
  );

  const suggestions: SuggestionItem[] = React.useMemo(() => {
    if (debouncedQuery.length < 1) return [];
    const items: SuggestionItem[] = [];

    if (suggestionsQuery.data?.users) {
      suggestionsQuery.data.users.forEach((u: any) => {
        items.push({
          type: "user",
          id: `u-${u.id}`,
          label: u.displayName || u.username,
          subLabel: `@${u.username}`,
          href: `/profile/${u.username}`,
          avatarUrl: u.avatarUrl,
          username: u.username,
        });
      });
    }

    if (searchQueryQuery.data?.posts) {
      (searchQueryQuery.data.posts as any[]).slice(0, 4).forEach((p) => {
        items.push({
          type: "post",
          id: `p-${p.id}`,
          label: p.question,
          subLabel: `${p._count?.votes ?? 0} votes`,
          href: `/post/${p.id}`,
        });
      });
    }

    if (searchQueryQuery.data?.tags) {
      (searchQueryQuery.data.tags as any[]).slice(0, 3).forEach((t) => {
        items.push({
          type: "tag",
          id: `t-${t.id}`,
          label: `#${t.name}`,
          subLabel: `${t.postCount ?? 0} posts`,
          href: `/search?q=${encodeURIComponent(`#${t.name}`)}`,
        });
      });
    }

    return items;
  }, [debouncedQuery, suggestionsQuery.data, searchQueryQuery.data]);

  const isLoading = suggestionsQuery.isLoading || searchQueryQuery.isLoading;

  const showDropdown =
    showSuggestions &&
    isFocused &&
    debouncedQuery.length >= 1 &&
    (suggestions.length > 0 || isLoading);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = query.trim();
    if (!q) return;
    if (onSubmit) {
      onSubmit(q);
    } else {
      router.push(`/search?q=${encodeURIComponent(q)}`);
    }
    setIsFocused(false);
    inputRef.current?.blur();
  };

  const handleSelect = (item: SuggestionItem) => {
    setQuery("");
    setActiveIndex(-1);
    setIsFocused(false);
    router.push(item.href);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || suggestions.length === 0) {
      if (e.key === "Enter") {
        handleSubmit(e);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev,
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (activeIndex >= 0 && suggestions[activeIndex]) {
          handleSelect(suggestions[activeIndex]);
        } else {
          handleSubmit(e);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsFocused(false);
        inputRef.current?.blur();
        break;
    }
  };

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsFocused(false);
      }
    };
    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showDropdown]);

  const renderIcon = (type: SuggestionItem["type"]) => {
    switch (type) {
      case "user":
        return <User className="h-4 w-4 text-muted-foreground" />;
      case "post":
        return <MessageCircle className="h-4 w-4 text-muted-foreground" />;
      case "tag":
      case "category":
        return <Hash className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div
      ref={dropdownRef}
      className={cn("relative w-full", className)}
    >
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <Search
            className={cn(
              "pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted-foreground",
              iconClasses[size],
            )}
          />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(-1);
            }}
            onFocus={() => setIsFocused(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            autoFocus={autoFocus}
            className={cn(
              "flex w-full rounded-full border border-border bg-muted/50",
              "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent focus:bg-background",
              "transition-colors",
              sizeClasses[size],
            )}
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setDebouncedQuery("");
                inputRef.current?.focus();
              }}
              className={cn(
                "absolute top-1/2 -translate-y-1/2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors",
                clearClasses[size],
                "flex items-center justify-center",
              )}
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </form>

      {showDropdown && (
        <div className="absolute left-0 right-0 top-full mt-2 z-50 rounded-xl border border-border bg-card shadow-popover animate-scaleIn overflow-hidden">
          {isLoading && suggestions.length === 0 ? (
            <div className="p-3 space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-2">
                  <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 w-1/2 bg-muted animate-pulse rounded" />
                    <div className="h-2 w-1/3 bg-muted animate-pulse rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto scrollbar-thin">
              {suggestions.length > 0 && (
                <div className="p-1.5">
                  {suggestions.map((item, idx) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setActiveIndex(idx)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg p-2.5 text-left transition-colors",
                        activeIndex === idx
                          ? "bg-muted"
                          : "hover:bg-muted/60",
                      )}
                    >
                      <div className="flex-shrink-0">
                        {item.type === "user" ? (
                          <UserAvatar
                            user={{
                              id: item.id,
                              avatarUrl: item.avatarUrl,
                              displayName: item.label,
                              username: item.username,
                            }}
                            size="sm"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                            {renderIcon(item.type)}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {item.label}
                        </p>
                        {item.subLabel && (
                          <p className="text-xs text-muted-foreground truncate">
                            {item.subLabel}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <div className="border-t border-border p-2.5">
                <button
                  type="button"
                  onClick={() => handleSubmit()}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm text-primary hover:bg-primary/5 transition-colors"
                >
                  <span>
                    Search{" "}
                    <span className="font-medium">
                      &quot;{debouncedQuery.slice(0, 30)}
                      {debouncedQuery.length > 30 ? "..." : ""}&quot;
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Press Enter
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
