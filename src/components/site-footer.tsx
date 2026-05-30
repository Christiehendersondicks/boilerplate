export function SiteFooter() {
  return (
    <footer className="border-t py-4 sm:py-6 text-center text-sm text-muted-foreground">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <p>
          © {new Date().getFullYear()} Stock Picks · Analysis only, not
          financial advice.
        </p>
      </div>
    </footer>
  );
}
