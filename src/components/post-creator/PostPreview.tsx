"use client";

import * as React from "react";
import { User } from "lucide-react";
import { PostCardScaffold, ScaffoldMediaItem } from "./PostCardScaffold";
import type { PostOptionInput } from "./OptionsEditor";
import type { OpinionTypeValue } from "./OpinionTypePicker";
import type { PostMediaInput } from "./MediaUploader";
import { Avatar } from "@/components/design-system/Avatar";

export interface PreviewDraftState {
  question: string;
  postType: OpinionTypeValue | null;
  options: PostOptionInput[];
  media: PostMediaInput[];
  category?: {
    id?: string;
    name: string;
    color?: string;
  } | null;
  isAnonymous: boolean;
  allowComments: boolean;
  tags: string[];
  expiresAt?: Date | null;
  currentUser?: {
    displayName?: string | null;
    username?: string | null;
    avatarUrl?: string | null;
  } | null;
}

export interface PostPreviewProps {
  draft: PreviewDraftState;
  className?: string;
}

export const PostPreview: React.FC<PostPreviewProps> = ({ draft, className }) => {
  const safeType: OpinionTypeValue = draft.postType ?? "YES_NO";

  const scaffoldMedia: ScaffoldMediaItem[] = draft.media.map((m) => ({
    type: m.type,
    url: m.url,
    thumbnailUrl: m.thumbnailUrl,
    posterUrl: m.posterUrl,
    mimeType: m.mimeType,
    width: m.width,
    height: m.height,
    duration: m.duration,
  }));

  const scaffoldOptions = draft.options.map((o, idx) => ({
    ...o,
    id: `preview-opt-${idx}`,
    voteCount: 0,
  }));

  const categoryObj = draft.category
    ? {
        id: draft.category.id,
        name: draft.category.name,
        color: draft.category.color,
      }
    : null;

  const authorName = draft.isAnonymous
    ? "Anonymous"
    : draft.currentUser?.displayName ?? draft.currentUser?.username ?? "You";
  const authorUsername = draft.isAnonymous
    ? "anonymous"
    : draft.currentUser?.username ?? "you";

  return (
    <div className={className}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Live Preview
        </h3>
        <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-success">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success/50 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
          </span>
          Live
        </span>
      </div>

      <PostCardScaffold
        author={{
          name: authorName,
          username: authorUsername,
          avatarUrl: draft.isAnonymous ? undefined : draft.currentUser?.avatarUrl,
          isAnonymous: draft.isAnonymous,
        }}
        category={categoryObj}
        question={draft.question}
        postType={safeType}
        options={scaffoldOptions}
        media={scaffoldMedia}
        tags={draft.tags}
        createdAt={new Date()}
        expiresAt={draft.expiresAt ?? undefined}
        allowComments={draft.allowComments}
        voteCount={1247}
        commentCount={86}
        saveCount={42}
        shareCount={18}
        showExamplePercentages={true}
        className="shadow-none"
      />

      <div className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-muted/50 px-3 py-2">
        {draft.isAnonymous ? (
          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center text-white flex-shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>
        ) : (
          <Avatar
            avatarUrl={draft.currentUser?.avatarUrl}
            displayName={draft.currentUser?.displayName ?? "You"}
            username={draft.currentUser?.username ?? "you"}
            size="sm"
          />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-foreground truncate">
            {draft.isAnonymous
              ? "Posted as Anonymous"
              : `Posted as @${authorUsername.replace(/^@/, "")}`}
          </p>
          <p className="text-[10px] text-muted-foreground truncate">
            {draft.allowComments
              ? "Comments are enabled"
              : "Comments are disabled"}
          </p>
        </div>
      </div>
    </div>
  );
};
