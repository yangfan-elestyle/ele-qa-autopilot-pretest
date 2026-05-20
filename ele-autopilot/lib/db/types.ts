// `*DbRow` 表示 SQL 直读结果, JSON 字段保持 string; 业务层使用对应的 `*Row`.
export type SortOrder = 'ASC' | 'DESC';

export type Id = string;

export type FolderRow = {
  id: Id;
  name: string;
  parent_id: Id | null;
  order_index: number | null;
  created_at: string;
  task_count: number;
};

export type TaskRow = {
  id: Id;
  folder_id: Id;
  title: string | null;
  text: string;
  sub_ids: Id[];
  source: string;
  created_at: string;
};

export type TaskDbRow = Omit<TaskRow, 'sub_ids'> & { sub_ids: string };

export type ListPageArgs = {
  limit: number;
  offset: number;
  sort?: string;
  order?: SortOrder;
  filter?: Record<string, unknown>;
};

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed';

// JSON string, 字段动态扩展 (max_steps / headless / ...).
export type JobConfig = Record<string, unknown>;

export type JobRow = {
  id: Id;
  task_id: Id;
  status: JobStatus;
  config: JobConfig;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  error: string | null;
};

export type JobDbRow = Omit<JobRow, 'config'> & { config: string };

export type JobTaskRow = {
  id: Id;
  job_id: Id;
  task_id: Id;
  task_index: number;
  task_title: string | null;
  task_text: string;
  status: JobStatus;
  result: TaskActionResult | null;
  error: string | null;
  started_at: string | null;
  completed_at: string | null;
};

export type JobTaskDbRow = Omit<JobTaskRow, 'result'> & { result: string | null };

// 完整执行结果, 可能很大 (含每步细节); 全量存储. 模板见 autopilot/task_action_out.template.json.
export type TaskActionResult = {
  timestamp: number;
  runtime: Record<string, unknown>;
  summary: {
    status: string;
    is_done: boolean;
    is_successful: boolean | null;
    started_at: number;
    completed_at: number;
    duration_seconds: number;
    total_steps: number;
    total_actions: number;
    step_error_count: number;
    action_error_count: number;
    final_result: string | null;
    judgement: {
      reasoning: string;
      verdict: boolean;
      failure_reason: string;
      impossible_task: boolean;
      reached_captcha: boolean;
    } | null;
    is_validated: boolean | null;
    all_extracted_content: string[];
    visited_urls: string[];
    action_sequence: string[];
    errors: string[];
    action_errors: string[];
  };
  steps: Array<{
    step_number: number;
    url: string;
    page_title: string;
    tabs: Array<{ url: string; title: string; target_id: string }>;
    thinking: string;
    evaluation: string;
    memory: string;
    next_goal: string;
    model_output: {
      thinking: string;
      evaluation_previous_goal: string;
      memory: string;
      next_goal: string;
      action: unknown[];
    };
    results: unknown[];
    duration_seconds: number;
    step_start_time: number;
    step_end_time: number;
  }>;
};

export type JobWithTasks = JobRow & {
  tasks: JobTaskRow[];
};

// 列表展示与轮询用; 只保留 summary, 减少数据传输量.
export type JobTaskLiteRow = {
  id: Id;
  job_id: Id;
  task_id: Id;
  task_index: number;
  task_title: string | null;
  task_text: string;
  status: JobStatus;
  result_summary: TaskActionResult['summary'] | null;
  error: string | null;
  started_at: string | null;
  completed_at: string | null;
};

export type JobWithTasksLite = JobRow & {
  tasks: JobTaskLiteRow[];
};

export type SettingRow = {
  key: string;
  value: string;
  updated_at: string;
};
