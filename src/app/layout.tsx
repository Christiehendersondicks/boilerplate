import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { WhopProvider } from "@/components/whop-provider";
import type { Metadata } from "next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const APP_NAME = "2G's Stock Picks";
const APP_DESCRIPTION =
  "Members-only stock picks and AI research — technical + fundamental signals, watchlist, and per-symbol analysis.";

export const metadata: Metadata = {
  title: {
    default: APP_NAME,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  keywords: [
    "stocks",
    "stock picks",
    "equity research",
    "technical analysis",
    "fundamental analysis",
    "watchlist",
    "Whop",
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: APP_NAME,
    title: APP_NAME,
    description: APP_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: APP_NAME,
    description: APP_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
  },
};

// JSON-LD structured data for SEO
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: APP_NAME,
  description: APP_DESCRIPTION,
  applicationCategory: "FinanceApplication",
  operatingSystem: "Any",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {/* Provides the Whop iframe SDK to client components when embedded
              inside whop.com; passes through when NEXT_PUBLIC_WHOP_APP_ID is unset. */}
          <WhopProvider>
            <SiteHeader />
            <main id="main-content" className="flex-1">{children}</main>
            <SiteFooter />
            <Toaster richColors position="top-right" />
          </WhopProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
