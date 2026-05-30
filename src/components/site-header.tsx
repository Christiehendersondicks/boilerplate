import Image from "next/image";
import Link from "next/link";
import { ModeToggle } from "./ui/mode-toggle";

export function SiteHeader() {
  return (
    <>
      {/* Skip to main content link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-background focus:text-foreground focus:border focus:rounded-md"
      >
        Skip to main content
      </a>
      <header className="border-b" role="banner">
        <nav
          className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 flex justify-between items-center"
          aria-label="Main navigation"
        >
          <h1 className="text-xl sm:text-2xl font-bold">
            <Link
              href="/"
              className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
              aria-label="Stock Picks - Go to homepage"
            >
              <Image
                src="/logo.png"
                alt="Stock Picks logo"
                width={1000}
                height={478}
                priority
                className="h-7 w-auto invert dark:invert-0"
              />
              <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                Stock Picks
              </span>
            </Link>
          </h1>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/picks"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Picks
            </Link>
            <ModeToggle />
          </div>
        </nav>
      </header>
    </>
  );
}
