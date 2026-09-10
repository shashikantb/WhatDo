import { POST_TYPES, ROLES, POST_STATUS, VOTE_OPTIONS, NOTIFICATION_TYPES } from "./constants";

export type PostType = (typeof POST_TYPES)[number];
export type Role = (typeof ROLES)[number];
export type PostStatus = (typeof POST_STATUS)[number];
export type VoteOption = (typeof VOTE_OPTIONS)[number];
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface PublicUser {
  id: string;
  name: string | null;
  username: string | null;
  image: string | null;
  bio: string | null;
  role: Role;
  followerCount: number;
  followingCount: number;
  isVerified: boolean;
  createdAt: Date;
}

export interface PostCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;
  postCount?: number;
}

export interface PostTag {
  id: string;
  name: string;
  postCount?: number;
}

export interface PollOption {
  id: string;
  text: string;
  voteCount: number;
  votedByCurrentUser?: boolean;
}

export interface Post {
  id: string;
  type: PostType;
  title: string;
  description: string | null;
  status: PostStatus;
  authorId: string;
  author: PublicUser;
  categoryId: string | null;
  category: PostCategory | null;
  tags: PostTag[];
  pollOptions: PollOption[];
  imageUrl: string | null;
  upvoteCount: number;
  downvoteCount: number;
  commentCount: number;
  viewCount: number;
  shareCount: number;
  currentUserVote: VoteOption | null;
  isBookmarked: boolean;
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
}

export interface Comment {
  id: string;
  content: string;
  postId: string;
  authorId: string;
  author: PublicUser;
  parentId: string | null;
  upvoteCount: number;
  downvoteCount: number;
  replyCount: number;
  currentUserVote: VoteOption | null;
  createdAt: Date;
  updatedAt: Date;
  replies?: Comment[];
}

export interface Notification {
  id: string;
  type: NotificationType;
  userId: string;
  actorId: string;
  actor: PublicUser;
  postId: string | null;
  commentId: string | null;
  isRead: boolean;
  message: string;
  createdAt: Date;
}

export interface ApiError {
  message: string;
  code?: string;
  issues?: Array<{
    path: (string | number)[];
    message: string;
  }>;
}

export interface PaginatedResponse<T> {
  items: T[];
  metadata: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export type SortType = "hot" | "new" | "top" | "rising";
export type TimeRange = "hour" | "day" | "week" | "month" | "year" | "all";
