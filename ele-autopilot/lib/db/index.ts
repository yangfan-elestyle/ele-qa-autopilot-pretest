export type {
  FolderRow,
  Id,
  JobConfig,
  JobRow,
  JobStatus,
  JobTaskLiteRow,
  JobTaskRow,
  JobWithTasks,
  JobWithTasksLite,
  ListPageArgs,
  SettingRow,
  SortOrder,
  TaskActionResult,
  TaskRow,
} from './types';

export { getDb } from './connection';

export {
  countFolders,
  createFolder,
  deleteFolderById,
  getFolderById,
  getFoldersByIds,
  listFoldersPage,
  reorderFolders,
  updateFolderById,
  upsertFolderByPath,
} from './folders';

export {
  countTasks,
  createTask,
  createTasks,
  deleteTaskById,
  getTaskById,
  getTasksByIds,
  listTasksPage,
  updateTaskById,
} from './tasks';

export {
  countJobs,
  createJob,
  deleteJobById,
  getJobById,
  getJobStatsByTaskIds,
  getJobTaskByIndex,
  getJobTaskIdsByTaskIds,
  getJobTasksByJobId,
  getJobWithTasks,
  getJobWithTasksLite,
  listJobsPage,
  syncJobStatusFromTasks,
  updateJobById,
  updateJobTaskByIndex,
} from './jobs';
export type { JobStats } from './jobs';

export {
  LLM_API_KEY_KEY,
  getAgentConfig,
  getLlmApiKey,
  getSetting,
  setAgentConfig,
  setLlmApiKey,
  setSetting,
} from './settings';
