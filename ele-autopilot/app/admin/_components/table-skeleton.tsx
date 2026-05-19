type TableSkeletonProps = {
  rows?: number;
  columns?: number;
};

export default function TableSkeleton({ rows = 6, columns = 3 }: TableSkeletonProps) {
  return (
    <div className="w-full" aria-hidden="true">
      <style>{`
        @keyframes ds-skeleton-shimmer {
          0% { background-position: -240px 0; }
          100% { background-position: 240px 0; }
        }
        .ds-skel-bar {
          background: linear-gradient(
            90deg,
            var(--ds-surface-subtle) 0%,
            var(--ds-surface-muted) 50%,
            var(--ds-surface-subtle) 100%
          );
          background-size: 480px 100%;
          animation: ds-skeleton-shimmer 1.4s ease-in-out infinite;
          border-radius: 6px;
        }
      `}</style>
      {Array.from({ length: rows }).map((_, ri) => (
        <div
          key={ri}
          className="flex items-center gap-4 border-b px-4 py-3"
          style={{ borderColor: 'var(--ds-border-soft)' }}
        >
          {Array.from({ length: columns }).map((__, ci) => {
            const widthPct = ci === 0 ? 14 : ci === columns - 1 ? 18 : 70 - ci * 8;
            const heightPx = ci === 1 ? 14 : 12;
            return (
              <div
                key={ci}
                className="ds-skel-bar"
                style={{
                  width: `${widthPct}%`,
                  height: heightPx,
                  opacity: 0.85 - ri * 0.05,
                }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
