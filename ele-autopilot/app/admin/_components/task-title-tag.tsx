export default function TaskTitleTag({ title }: { title: string | null | undefined }) {
  if (!title) return null;
  return (
    <span
      className="ds-text-mono mr-1.5 inline-flex items-center rounded px-1.5 py-px text-[11px] font-medium align-baseline"
      style={{
        background: 'var(--ds-brand-50)',
        color: 'var(--ds-brand-700)',
        boxShadow: 'inset 0 0 0 1px rgba(99, 102, 241, 0.18)',
      }}
    >
      {title}
    </span>
  );
}
