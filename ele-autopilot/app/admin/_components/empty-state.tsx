import type { ReactNode } from 'react';

type EmptyStateProps = {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  tone?: 'neutral' | 'brand';
};

export default function EmptyState({
  icon,
  title,
  description,
  action,
  size = 'md',
  tone = 'brand',
}: EmptyStateProps) {
  const pad =
    size === 'sm' ? 'px-6 py-8' : size === 'lg' ? 'px-10 py-16' : 'px-8 py-12';
  const iconSize = size === 'sm' ? 36 : size === 'lg' ? 56 : 44;

  return (
    <div className={`flex flex-col items-center justify-center text-center ${pad}`}>
      {icon && (
        <div
          className="mb-3 flex items-center justify-center rounded-2xl"
          style={{
            width: iconSize,
            height: iconSize,
            background:
              tone === 'brand' ? 'var(--ds-brand-50)' : 'var(--ds-surface-subtle)',
            color:
              tone === 'brand' ? 'var(--ds-brand-600)' : 'var(--ds-text-tertiary)',
            boxShadow:
              tone === 'brand'
                ? 'inset 0 0 0 1px rgba(99, 102, 241, 0.18)'
                : 'inset 0 0 0 1px var(--ds-border-soft)',
          }}
          aria-hidden="true"
        >
          <span className="text-[20px] leading-none">{icon}</span>
        </div>
      )}
      <div
        className="text-[14px] font-semibold"
        style={{ color: 'var(--ds-text-primary)' }}
      >
        {title}
      </div>
      {description && (
        <div
          className="mt-1 max-w-md text-[12.5px] leading-relaxed"
          style={{ color: 'var(--ds-text-tertiary)' }}
        >
          {description}
        </div>
      )}
      {action && <div className="mt-4 flex flex-wrap items-center justify-center gap-2">{action}</div>}
    </div>
  );
}
