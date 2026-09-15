"use client";

import * as React from "react";
import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import type { SessionProviderProps } from "next-auth/react";

export const SessionProviderWrapper: React.FC<SessionProviderProps> = (props) => {
  return <NextAuthSessionProvider {...props} />;
};
