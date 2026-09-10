import { auth } from "@/../auth";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const path = req.nextUrl.pathname;

  const isProtectedRoute =
    path.startsWith("/feed") ||
    path.startsWith("/ask") ||
    path.startsWith("/notifications") ||
    path.startsWith("/saved") ||
    path.startsWith("/settings") ||
    path.startsWith("/profile/me");

  const isAdminRoute = path.startsWith("/admin");

  if (
    isAdminRoute &&
    (!isLoggedIn || req.auth?.user.role !== "ADMIN")
  ) {
    return Response.redirect(new URL("/login", req.nextUrl));
  }

  if (isProtectedRoute && !isLoggedIn) {
    return Response.redirect(new URL("/login", req.nextUrl));
  }
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|manifest|sitemap|robots|opengraph|public|p).*)",
  ],
};
