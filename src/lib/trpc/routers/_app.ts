import { createTRPCRouter } from "../trpc";
import { authRouter } from "./auth.router";
import { postsRouter } from "./posts.router";
import { votingRouter } from "./voting.router";
import { commentsRouter } from "./comments.router";
import { feedRouter } from "./feed.router";
import { usersRouter } from "./users.router";
import { socialRouter } from "./social.router";
import { searchRouter } from "./search.router";
import { notificationsRouter } from "./notifications.router";
import { reportsRouter } from "./reports.router";
import { categoriesRouter } from "./categories.router";
import { adminRouter } from "./admin.router";
import { mediaRouter } from "./media.router";
import { adsRouter } from "./ads.router";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  posts: postsRouter,
  voting: votingRouter,
  comments: commentsRouter,
  feed: feedRouter,
  users: usersRouter,
  social: socialRouter,
  search: searchRouter,
  notifications: notificationsRouter,
  reports: reportsRouter,
  categories: categoriesRouter,
  admin: adminRouter,
  media: mediaRouter,
  ads: adsRouter,
});

export type AppRouter = typeof appRouter;
