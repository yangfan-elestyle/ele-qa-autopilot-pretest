import type { ReactNode } from 'react';

export type MetricTone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';

type ToneToken = {
  fg: string;
  bg: string;
  ring: string;
  dot: string;
};

const TONE: Record<MetricTone, ToneToken> = {
  neutral: {
    fg: 'var(--ds-text-primary)',
    bg: 'var(--ds-surface-subtle)',
    ring: 'var(--ds-border-soft)',
    dot: 'var(--ds-text-tertiary)',
  },
  brand: {
    fg: 'var(--ds-brand-700)',
    bg: 'var(--ds-brand-50)',
    ring: 'rgba(99, 102, 241, 0.18)',
    dot: 'var(--ds-brand-500)',
  },
  success: {
    fg: '#15803d',
    bg: 'rgba(22, 163, 74, 0.1)',
    ring: 'rgba(22, 163, 74, 0.2)',
    dot: '#16a34a',
  },
  warning: {
    fg: '#b45309',
    bg: 'rgba(217, 119, 6, 0.1)',
    ring: 'rgba(217, 119, 6, 0.2)',
    dot: '#d97706',
  },
  danger: {
    fg: '#b91c1c',
    bg: 'rgba(220, 38, 38, 0.08)',
    ring: 'rgba(220, 38, 38, 0.22)',
    dot: '#dc2626',
  },
  info: {
    fg: '#2563eb',
    bg: 'rgba(37, 99, 235, 0.1)',
    ring: 'rgba(37, 99, 235, 0.2)',
    dot: '#2563eb',
  },
};

type MetricTileProps = {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: MetricTone;
  icon?: ReactNode;
  align?: 'start' | 'center';
};

export default function MetricTile({
  label,
  value,
  hint,
  tone = 'neutral',
  icon,
  align = 'start',
}: MetricTileProps) {
  const token = TONE[tone];
  return (
    <div
      className="flex min-w-0 flex-col gap-1 rounded-xl px-4 py-3 transition-colors"
      style={{
        background: 'var(--ds-surface-elevated)',
        border: '1px solid var(--ds-border-soft)',
        boxShadow: 'var(--ds-shadow-xs)',
        alignItems: align === 'center' ? 'center' : 'flex-start',
      }}
    >
      <div className="flex w-full items-center gap-1.5">
        <span
          className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ background: token.dot }}
          aria-hidden="true"
        />
        <span
          className="truncate text-[11px] font-medium tracking-wide uppercase"
          style={{ color: 'var(--ds-text-tertiary)' }}
        >
          {label}
        </span>
        {icon && (
          <span
            className="ml-auto inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md"
            style={{ background: token.bg, color: token.fg, boxShadow: `inset 0 0 0 1px ${token.ring}` }}
          >
            {icon}
          </span>
        )}
      </div>
      <div
        className="ds-text-mono w-full truncate text-[20px] font-semibold leading-[1.15]"
        style={{ color: token.fg, fontFeatureSettings: '"tnum" 1, "ss01" 1' }}
        title={typeof value === 'string' || typeof value === 'number' ? String(value) : undefined}
      >
        {value}
      </div>
      {hint && (
        <div
          className="w-full truncate text-[11px]"
          style={{ color: 'var(--ds-text-tertiary)' }}
        >
          {hint}
        </div>
      )}
    </div>
  );
}
