"use client";

import * as React from "react";

interface SessionProviderWrapperProps {
  children: React.ReactNode;
  session?: unknown;
}

export const SessionProviderWrapper: React.FC<SessionProviderWrapperProps> = ({
  children,
  session,
}) => {
  const [NextAuthSessionProvider, setNextAuthSessionProvider] =
    React.useState<null | React.ComponentType<{
      children: React.ReactNode;
      session?: unknown;
    }>>(null);

  React.useEffect(() => {
    let cancelled = false;
    import("next-auth/react")
      .then((mod) => {
        if (!cancelled && mod?.SessionProvider) {
          setNextAuthSessionProvider(() => mod.SessionProvider);
        }
      })
      .catch(() => {
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (NextAuthSessionProvider) {
    return (
      <NextAuthSessionProvider session={session}>{children}</NextAuthSessionProvider>
    );
  }

  return <>{children}</>;
};
