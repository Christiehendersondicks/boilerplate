"use client";

import { WhopIframeSdkProvider } from "@whop/react/iframe";

// The Whop iframe SDK requires NEXT_PUBLIC_WHOP_APP_ID and throws without it
// (including during static prerender). Mount it only when configured; otherwise
// pass children through so the app still builds and runs standalone.
export function WhopProvider({ children }: { children: React.ReactNode }) {
  if (!process.env.NEXT_PUBLIC_WHOP_APP_ID) return <>{children}</>;
  return <WhopIframeSdkProvider>{children}</WhopIframeSdkProvider>;
}
