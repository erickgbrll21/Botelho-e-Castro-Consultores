/** Skeleton leve enquanto a página RSC carrega (navegação entre abas). */
export function RouteLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-3 w-24 animate-pulse rounded bg-neutral-800" />
        <div className="h-8 w-56 max-w-full animate-pulse rounded bg-neutral-900" />
        <div className="h-4 w-full max-w-md animate-pulse rounded bg-neutral-900" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-32 animate-pulse rounded-2xl border border-neutral-800/80 bg-neutral-900/40"
          />
        ))}
      </div>
    </div>
  );
}
