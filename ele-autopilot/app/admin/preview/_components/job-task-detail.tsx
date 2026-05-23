import {
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  LinkOutlined,
  LoadingOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Collapse,
  Descriptions,
  Image,
  Spin,
  Tag,
  Typography,
} from 'antd';
import { useState } from 'react';

import type { JobTask, JobTaskLite, TaskActionResult } from '../../_types';

const { Text, Paragraph } = Typography;

function formatDurationSeconds(seconds: number | null | undefined): string {
  if (seconds == null) return '-';
  const s = Math.round(seconds);
  if (s < 60) return `${s}秒`;
  if (s < 3600) return `${Math.floor(s / 60)}分${s % 60}秒`;
  return `${Math.floor(s / 3600)}时${Math.floor((s % 3600) / 60)}分${s % 60}秒`;
}

type JobTaskDetailProps = {
  taskLite: JobTaskLite;
  taskDetail: JobTask | null;
  loading: boolean;
};

type StepInfo = TaskActionResult['steps'][number];

export default function JobTaskDetail({ taskLite, taskDetail, loading }: JobTaskDetailProps) {
  const fullResult = taskDetail?.result as TaskActionResult | null;
  const summary = fullResult?.summary ?? taskLite.result_summary;
  const error = taskDetail?.error ?? taskLite.error;

  if (loading && !summary) {
    return (
      <div className="space-y-3 p-4" style={{ background: 'var(--ds-surface-subtle)' }}>
        <Card size="small" title="执行详情" className="bg-white">
          <div className="flex items-center justify-center py-8">
            <Spin indicator={<LoadingOutlined spin />} />
            <span className="ml-2 text-(--ds-text-tertiary)">加载详情中...</span>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4" style={{ background: 'var(--ds-surface-subtle)' }}>
      {error && (
        <Alert type="error" message="执行错误" description={error} showIcon />
      )}

      {summary ? (
        <>
          <ResultSummary summary={summary} runtime={fullResult?.runtime} />

          {loading ? (
            <Card size="small" title="执行步骤" className="bg-white">
              <div className="flex items-center justify-center py-8">
                <Spin indicator={<LoadingOutlined spin />} />
                <span className="ml-2 text-(--ds-text-tertiary)">加载详情中...</span>
              </div>
            </Card>
          ) : fullResult?.steps && fullResult.steps.length > 0 ? (
            <StepsList steps={fullResult.steps} />
          ) : (
            <Card size="small" title="执行步骤" className="bg-white">
              <div className="py-4 text-center text-(--ds-text-tertiary)">
                {taskLite.status === 'running' ? '执行中...' : '暂无步骤详情'}
              </div>
            </Card>
          )}
        </>
      ) : (
        <div className="py-8 text-center text-(--ds-text-tertiary)">
          {taskLite.status === 'pending'
            ? '等待执行'
            : taskLite.status === 'running'
              ? '正在执行...'
              : '无执行结果'}
        </div>
      )}
    </div>
  );
}

function ResultSummary({
  summary,
  runtime,
}: {
  summary: TaskActionResult['summary'];
  runtime?: TaskActionResult['runtime'];
}) {
  if (!summary) return null;
  const isSuccess = summary.is_successful === true;
  const judgement = summary.judgement;

  return (
    <Card size="small" title="执行摘要" className="bg-white">
      <Descriptions size="small" column={{ xs: 1, sm: 2 }}>
        <Descriptions.Item label="执行状态">
          <Tag
            color={isSuccess ? 'success' : summary.is_successful === false ? 'error' : 'default'}
          >
            {summary.status}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="执行时长">
          {formatDurationSeconds(summary.duration_seconds)}
        </Descriptions.Item>
        <Descriptions.Item label="总步骤数">{summary.total_steps ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="总动作数">{summary.total_actions ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="步骤错误数">
          <span style={summary.step_error_count > 0 ? { color: '#dc2626' } : undefined}>
            {summary.step_error_count ?? 0}
          </span>
        </Descriptions.Item>
        <Descriptions.Item label="动作错误数">
          <span style={summary.action_error_count > 0 ? { color: '#dc2626' } : undefined}>
            {summary.action_error_count ?? 0}
          </span>
        </Descriptions.Item>
      </Descriptions>

      {summary.final_result && (
        <Section label="最终结果">
          <Paragraph
            className="!mt-1 !mb-0 rounded p-2 text-sm"
            style={{ background: 'var(--ds-surface-subtle)' }}
          >
            {summary.final_result}
          </Paragraph>
        </Section>
      )}

      {judgement && (
        <Section label="AI 判定">
          <div className="mt-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Tag color={judgement.verdict ? 'success' : 'error'}>
                {judgement.verdict ? '成功' : '失败'}
              </Tag>
              {judgement.impossible_task && <Tag color="warning">不可能完成的任务</Tag>}
              {judgement.reached_captcha && <Tag color="warning">遇到验证码</Tag>}
            </div>
            {judgement.reasoning && (
              <Paragraph
                className="!mb-0 rounded p-2 text-xs"
                style={{ background: 'var(--ds-surface-subtle)' }}
              >
                {judgement.reasoning}
              </Paragraph>
            )}
            {judgement.failure_reason && (
              <Alert type="error" message="失败原因" description={judgement.failure_reason} />
            )}
          </div>
        </Section>
      )}

      {summary.visited_urls && summary.visited_urls.length > 0 && (
        <Section label={`访问的 URL (${summary.visited_urls.length})`}>
          <div className="mt-1 max-h-16 overflow-auto">
            {summary.visited_urls.map((url, i) => (
              <div key={i} className="truncate text-xs">
                <a href={url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                  <LinkOutlined className="mr-1" />
                  {url}
                </a>
              </div>
            ))}
          </div>
        </Section>
      )}

      {summary.action_sequence && summary.action_sequence.length > 0 && (
        <Section label={`动作序列 (${summary.action_sequence.length})`}>
          <div className="mt-1 flex max-h-16 flex-wrap gap-1 overflow-auto">
            {summary.action_sequence.map((action, i) => (
              <Tag key={i} className="text-xs">
                {action}
              </Tag>
            ))}
          </div>
        </Section>
      )}

      {summary.all_extracted_content && summary.all_extracted_content.length > 0 && (
        <Section label={`提取的内容 (${summary.all_extracted_content.length})`}>
          <div
            className="mt-1 max-h-16 overflow-auto rounded p-2"
            style={{ background: 'var(--ds-surface-subtle)' }}
          >
            {summary.all_extracted_content.map((content, i) => (
              <div
                key={i}
                className="border-b py-1 text-xs last:border-b-0"
                style={{ borderColor: 'var(--ds-border-soft)' }}
              >
                {content}
              </div>
            ))}
          </div>
        </Section>
      )}

      {summary.errors && summary.errors.length > 0 && (
        <Section label="错误信息">
          {summary.errors.map((err, i) => (
            <Alert key={i} type="error" message={err} className="mt-1" />
          ))}
        </Section>
      )}

      {runtime && <RuntimeInfo runtime={runtime} />}
    </Card>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      className="mt-3 border-t pt-3"
      style={{ borderColor: 'var(--ds-border-soft)' }}
    >
      <Text type="secondary" className="text-xs">
        {label}
      </Text>
      {children}
    </div>
  );
}

function StepsList({ steps }: { steps: StepInfo[] }) {
  const [activeKeys, setActiveKeys] = useState<number[]>(() => {
    const total = steps.length;
    if (total <= 3) return steps.map((_, i) => i);
    return [total - 3, total - 2, total - 1];
  });

  const handleExpandAll = () => setActiveKeys(steps.map((_, i) => i));
  const handleCollapseAll = () => setActiveKeys([]);
  const handleExpandDown10 = (fromIndex: number) => {
    const newKeys = Array.from(
      { length: Math.min(10, steps.length - fromIndex) },
      (_, i) => fromIndex + i,
    );
    setActiveKeys((prev) => [...new Set([...prev, ...newKeys])]);
  };

  const cumulativeTimes = steps.reduce<number[]>((acc, step, index) => {
    const prevTime = index === 0 ? 0 : acc[index - 1];
    acc.push(prevTime + (step.duration_seconds ?? 0));
    return acc;
  }, []);

  const collapseItems = steps.map((step, index) => ({
    key: index,
    label: (
      <StepLabel
        step={step}
        index={index}
        totalSteps={steps.length}
        cumulativeTime={cumulativeTimes[index]}
        onExpandAll={handleExpandAll}
        onCollapseAll={handleCollapseAll}
        onExpandDown10={() => handleExpandDown10(index)}
      />
    ),
    children: <StepDetail step={step} />,
  }));

  return (
    <Card
      size="small"
      title={`执行步骤 · ${steps.length}`}
      className="bg-white [&_.ant-card-body]:p-0 md:[&_.ant-card-body]:max-h-[500px] md:[&_.ant-card-body]:overflow-auto"
    >
      <Collapse
        activeKey={activeKeys}
        onChange={(keys) => setActiveKeys((Array.isArray(keys) ? keys : [keys]).map(Number))}
        items={collapseItems}
        className="rounded-none border-0 [&_.ant-collapse-content-box]:p-0 [&_.ant-collapse-item:last-child]:border-b-0 [&_.ant-collapse-item]:border-b [&_.ant-collapse-item]:border-b-(--ds-border-soft)"
      />
    </Card>
  );
}

function StepLabel({
  step,
  index,
  totalSteps,
  cumulativeTime,
  onExpandAll,
  onCollapseAll,
  onExpandDown10,
}: {
  step: StepInfo;
  index: number;
  totalSteps: number;
  cumulativeTime: number;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onExpandDown10: () => void;
}) {
  const hasError = step.results?.some((r: unknown) => {
    const result = r as { error?: string | null };
    return result.error;
  });

  const handleButtonClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };

  return (
    <div className="flex w-full flex-wrap items-center gap-x-2 gap-y-1 sm:flex-nowrap">
      <span
        className="ds-text-mono flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold"
        style={{
          background: hasError ? 'rgba(220, 38, 38, 0.12)' : 'var(--ds-brand-100)',
          color: hasError ? '#b91c1c' : 'var(--ds-brand-700)',
        }}
      >
        {step.step_number}
      </span>
      {hasError ? (
        <ExclamationCircleOutlined style={{ color: '#dc2626' }} />
      ) : (
        <CheckCircleOutlined style={{ color: '#16a34a' }} />
      )}
      <span className="min-w-0 flex-1 truncate text-xs" title={step.page_title}>
        {step.page_title || '未知页面'}
      </span>
      <span
        className="ds-text-mono shrink-0 text-[11px]"
        style={{ color: 'var(--ds-text-tertiary)' }}
      >
        {formatDurationSeconds(cumulativeTime)} / {formatDurationSeconds(step.duration_seconds)}
      </span>
      <div className="flex shrink-0 basis-full flex-wrap gap-x-1 sm:basis-auto">
        <Button
          size="small"
          type="link"
          className="!px-1 !text-xs"
          onClick={(e) => handleButtonClick(e, onExpandAll)}
        >
          全部展开
        </Button>
        <Button
          size="small"
          type="link"
          className="!px-1 !text-xs"
          onClick={(e) => handleButtonClick(e, onCollapseAll)}
        >
          全部关闭
        </Button>
        {index + 10 < totalSteps && (
          <Button
            size="small"
            type="link"
            className="!px-1 !text-xs"
            onClick={(e) => handleButtonClick(e, onExpandDown10)}
          >
            ↓ 展开10
          </Button>
        )}
      </div>
    </div>
  );
}

function StepDetail({ step }: { step: StepInfo }) {
  const modelOutput = step.model_output;

  return (
    <div
      className="space-y-3 p-3"
      style={{ background: 'var(--ds-surface-subtle)' }}
    >
      <Descriptions size="small" column={1} className="[&_.ant-descriptions-item]:pb-1">
        <Descriptions.Item label="URL">
          <a
            href={step.url}
            target="_blank"
            rel="noopener noreferrer"
            className="truncate text-xs hover:underline"
          >
            {step.url}
          </a>
        </Descriptions.Item>
        <Descriptions.Item label="页面标题">{step.page_title || '-'}</Descriptions.Item>
        <Descriptions.Item label="耗时">
          {formatDurationSeconds(step.duration_seconds)}
        </Descriptions.Item>
      </Descriptions>

      {step.thinking_image && step.thinking_image !== '<string>' && (
        <DetailBlock label="页面截图">
          <Image
            src={
              /^(data:|https?:\/\/|\/)/.test(step.thinking_image)
                ? step.thinking_image
                : `data:image/png;base64,${step.thinking_image}`
            }
            alt="页面截图"
            className="max-h-64 max-w-full rounded border"
            placeholder
          />
        </DetailBlock>
      )}

      {(step.thinking || modelOutput?.thinking) && (
        <DetailBlock label={<><ThunderboltOutlined className="mr-1" />LLM 思考</>}>
          <Paragraph className="!mb-0 rounded bg-white p-2 text-xs whitespace-pre-wrap">
            {step.thinking || modelOutput?.thinking}
          </Paragraph>
        </DetailBlock>
      )}

      {(step.evaluation || modelOutput?.evaluation_previous_goal) && (
        <DetailBlock label="上一步评估">
          <Paragraph className="!mb-0 rounded bg-white p-2 text-xs whitespace-pre-wrap">
            {step.evaluation || modelOutput?.evaluation_previous_goal}
          </Paragraph>
        </DetailBlock>
      )}

      {(step.next_goal || modelOutput?.next_goal) && (
        <DetailBlock label="下一步目标">
          <Paragraph className="!mb-0 rounded bg-white p-2 text-xs whitespace-pre-wrap">
            {step.next_goal || modelOutput?.next_goal}
          </Paragraph>
        </DetailBlock>
      )}

      {(step.memory || modelOutput?.memory) && (
        <DetailBlock label="记忆">
          <Paragraph className="!mb-0 rounded bg-white p-2 text-xs whitespace-pre-wrap">
            {step.memory || modelOutput?.memory}
          </Paragraph>
        </DetailBlock>
      )}

      {modelOutput?.action && modelOutput.action.length > 0 && (
        <DetailBlock label="执行动作">
          <div className="rounded bg-white p-2">
            {modelOutput.action.map((action: unknown, i: number) => (
              <pre key={i} className="mb-1 overflow-auto text-xs whitespace-pre-wrap last:mb-0">
                {JSON.stringify(action, null, 2)}
              </pre>
            ))}
          </div>
        </DetailBlock>
      )}

      {step.results && step.results.length > 0 && (
        <DetailBlock label="执行结果">
          <div className="space-y-2">
            {step.results.map((result: unknown, i: number) => {
              const r = result as {
                is_done?: boolean;
                success?: boolean | null;
                error?: string | null;
                extracted_content?: string;
                long_term_memory?: string;
              };
              return (
                <div key={i} className="rounded bg-white p-2 text-xs">
                  {r.is_done && (
                    <Tag color="green" className="mb-1">
                      完成
                    </Tag>
                  )}
                  {r.error && <Alert type="error" message={r.error} className="mb-1" />}
                  {r.extracted_content && (
                    <div className="mb-1">
                      <span className="text-(--ds-text-tertiary)">提取内容: </span>
                      {r.extracted_content}
                    </div>
                  )}
                  {r.long_term_memory && (
                    <div>
                      <span className="text-(--ds-text-tertiary)">长期记忆: </span>
                      {r.long_term_memory}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </DetailBlock>
      )}

      {step.tabs && step.tabs.length > 0 && (
        <DetailBlock label={`浏览器标签页 (${step.tabs.length})`}>
          <div className="rounded bg-white p-2">
            {step.tabs.map((tab, i) => (
              <div
                key={i}
                className="border-b py-1 text-xs last:border-b-0"
                style={{ borderColor: 'var(--ds-border-soft)' }}
              >
                <div className="font-medium">{tab.title || '无标题'}</div>
                <div className="truncate text-(--ds-text-tertiary)">{tab.url}</div>
              </div>
            ))}
          </div>
        </DetailBlock>
      )}
    </div>
  );
}

function DetailBlock({
  label,
  children,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Text type="secondary" className="!text-xs">
        {label}
      </Text>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function RuntimeInfo({ runtime }: { runtime: TaskActionResult['runtime'] }) {
  const formatValue = (value: unknown): string => {
    if (value === null) return 'null';
    if (value === undefined) return '-';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  return (
    <Section label="运行时环境">
      <div
        className="mt-1 rounded p-2"
        style={{ background: 'var(--ds-surface-muted)' }}
      >
        <pre className="ds-text-mono m-0 overflow-auto text-[11px] whitespace-pre-wrap">
          {Object.entries(runtime).map(([key, value]) => (
            <div key={key} className="py-0.5">
              <span style={{ color: 'var(--ds-text-tertiary)' }}>{key}:</span>{' '}
              <span style={{ color: 'var(--ds-text-secondary)' }}>{formatValue(value)}</span>
            </div>
          ))}
        </pre>
      </div>
    </Section>
  );
}
