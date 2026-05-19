import {
  CheckCircleFilled,
  ClockCircleFilled,
  CloseCircleFilled,
  LoadingOutlined,
} from '@ant-design/icons';
import type { ReactNode } from 'react';

import type { JobStatus } from '../_types';

type ToneToken = {
  bg: string;
  fg: string;
  ring: string;
  icon: ReactNode;
  label: string;
};

const JOB_TONE: Record<JobStatus, ToneToken> = {
  pending: {
    bg: 'rgba(148, 163, 184, 0.14)',
    fg: '#475569',
    ring: 'rgba(148, 163, 184, 0.3)',
    icon: <ClockCircleFilled />,
    label: '等待中',
  },
  running: {
    bg: 'rgba(37, 99, 235, 0.12)',
    fg: '#2563eb',
    ring: 'rgba(37, 99, 235, 0.28)',
    icon: <LoadingOutlined spin />,
    label: '执行中',
  },
  completed: {
    bg: 'rgba(22, 163, 74, 0.12)',
    fg: '#15803d',
    ring: 'rgba(22, 163, 74, 0.3)',
    icon: <CheckCircleFilled />,
    label: '成功',
  },
  failed: {
    bg: 'rgba(220, 38, 38, 0.1)',
    fg: '#b91c1c',
    ring: 'rgba(220, 38, 38, 0.28)',
    icon: <CloseCircleFilled />,
    label: '失败',
  },
};

type StatusPillProps = {
  status: JobStatus;
  size?: 'sm' | 'md';
  showIcon?: boolean;
  label?: string;
};

export default function StatusPill({
  status,
  size = 'md',
  showIcon = true,
  label,
}: StatusPillProps) {
  const tone = JOB_TONE[status];
  const padding = size === 'sm' ? '2px 8px' : '3px 10px';
  const fontSize = size === 'sm' ? 11 : 12;

  return (
    <span
      className="ds-text-mono inline-flex items-center gap-1 font-medium whitespace-nowrap"
      style={{
        background: tone.bg,
        color: tone.fg,
        boxShadow: `inset 0 0 0 1px ${tone.ring}`,
        borderRadius: 999,
        padding,
        fontSize,
        lineHeight: 1.4,
        letterSpacing: '0.01em',
      }}
    >
      {showIcon && (
        <span className="inline-flex items-center text-[0.85em]">{tone.icon}</span>
      )}
      <span>{label ?? tone.label}</span>
    </span>
  );
}

export { JOB_TONE };
