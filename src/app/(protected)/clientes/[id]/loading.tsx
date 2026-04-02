export default function ClienteDetalheLoading() {
  return (
    <div className="space-y-6">
      <div className="h-10 w-2/3 max-w-lg animate-pulse rounded-lg bg-neutral-900" />
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-48 animate-pulse rounded-2xl border border-neutral-800/80 bg-neutral-900/40"
          />
        ))}
      </div>
    </div>
  );
}
