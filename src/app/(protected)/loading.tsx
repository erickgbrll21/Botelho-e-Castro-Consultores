export default function ProtectedLoading() {
  return (
    <div className="min-h-screen bg-neutral-950 p-4 md:p-8 text-neutral-50">
      <div className="mx-auto flex max-w-7xl flex-col md:flex-row gap-6">
        <aside className="hidden md:block w-60 shrink-0 space-y-4 rounded-2xl border border-neutral-800/80 bg-neutral-950/60 p-4">
          <div className="h-16 w-full animate-pulse rounded-xl bg-neutral-900" />
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-10 w-full animate-pulse rounded-xl bg-neutral-900"
              />
            ))}
          </div>
        </aside>
        <div className="flex-1 space-y-4">
          <header className="glass-panel flex items-center justify-between rounded-2xl border border-neutral-800/80 px-4 py-3 md:px-5 md:py-4">
            <div className="h-10 w-40 animate-pulse rounded-lg bg-neutral-900" />
            <div className="h-9 w-28 animate-pulse rounded-lg bg-neutral-900" />
          </header>
          <main className="space-y-4">
            <div className="h-8 w-48 animate-pulse rounded bg-neutral-900" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-36 animate-pulse rounded-2xl border border-neutral-800/80 bg-neutral-900/50"
                />
              ))}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
