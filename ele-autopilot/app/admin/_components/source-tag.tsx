// source !== 'manual' 时渲染来源徽章 (e.g. ingest 接口注入的 task).
// 颜色按 source 字符串 hash 到固定调色板, 同一 source 颜色稳定且不写死 enum, 兼容未来任意调用方.
const PALETTE = [
  { bg: '#e6f4ff', fg: '#0958d9', border: 'rgba(9, 88, 217, 0.20)' }, // blue
  { bg: '#fff7e6', fg: '#d46b08', border: 'rgba(212, 107, 8, 0.20)' }, // orange
  { bg: '#f6ffed', fg: '#389e0d', border: 'rgba(56, 158, 13, 0.20)' }, // green
  { bg: '#fff1f0', fg: '#cf1322', border: 'rgba(207, 19, 34, 0.20)' }, // red
  { bg: '#f9f0ff', fg: '#722ed1', border: 'rgba(114, 46, 209, 0.20)' }, // purple
  { bg: '#fff0f6', fg: '#c41d7f', border: 'rgba(196, 29, 127, 0.20)' }, // magenta
  { bg: '#e6fffb', fg: '#08979c', border: 'rgba(8, 151, 156, 0.20)' }, // cyan
];

function hashIndex(s: string, mod: number): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % mod;
}

export default function SourceTag({ source }: { source: string | null | undefined }) {
  if (!source || source === 'manual') return null;
  const color = PALETTE[hashIndex(source, PALETTE.length)];
  return (
    <span
      className="ds-text-mono mr-1.5 inline-flex items-center rounded px-1.5 py-px align-baseline text-[11px] font-medium"
      style={{
        background: color.bg,
        color: color.fg,
        boxShadow: `inset 0 0 0 1px ${color.border}`,
      }}
      title={`来源：${source}`}
    >
      {source}
    </span>
  );
}
