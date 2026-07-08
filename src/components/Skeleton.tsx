function Block({ className }: { className: string }) {
  return <div className={`shimmer rounded-lg ${className}`} />;
}

export default function SkeletonShell() {
  return (
    <div className="min-h-screen" aria-busy="true" aria-label="Loading scan data">
      <div className="mx-auto max-w-[1400px] px-5 py-6">
        <div className="flex items-center justify-between">
          <Block className="h-8 w-56" />
          <Block className="h-8 w-64" />
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Block key={i} className="h-20" />
          ))}
        </div>
        <div className="mt-6 grid gap-5 lg:grid-cols-[340px_1fr]">
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Block key={i} className="h-28" />
            ))}
          </div>
          <div className="space-y-4">
            <Block className="h-40" />
            <div className="grid gap-4 lg:grid-cols-2">
              <Block className="h-48" />
              <Block className="h-48" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
