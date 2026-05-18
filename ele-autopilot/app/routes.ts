import { type RouteConfig, route, index } from '@react-router/dev/routes';

export default [
  index('routes/_index.tsx'),
  route('autopilot', 'routes/autopilot._index.tsx'),
  route('autopilot/preview/:taskId', 'routes/autopilot.preview.$taskId.tsx'),
  route('help', 'routes/help.tsx'),

  // Admin REST API
  route('api/admin/folders', 'routes/api.admin.folders.tsx'),
  route('api/admin/folders/reorder', 'routes/api.admin.folders.reorder.tsx'),
  route('api/admin/folders/:id', 'routes/api.admin.folders.$id.tsx'),
  route('api/admin/tasks', 'routes/api.admin.tasks.tsx'),
  route('api/admin/tasks/stats', 'routes/api.admin.tasks.stats.tsx'),
  route('api/admin/tasks/:id', 'routes/api.admin.tasks.$id.tsx'),
  route('api/admin/jobs', 'routes/api.admin.jobs.tsx'),
  route('api/admin/jobs/:id', 'routes/api.admin.jobs.$id.tsx'),
  route('api/admin/jobs/:id/tasks/:taskIndex', 'routes/api.admin.jobs.$id.tasks.$taskIndex.tsx'),
  route('api/admin/settings', 'routes/api.admin.settings.tsx'),

  // External runner callbacks
  route('api/jobs/:id/callback/complete', 'routes/api.jobs.$id.callback.complete.tsx'),
  route('api/jobs/:id/callback/task', 'routes/api.jobs.$id.callback.task.tsx'),

  // Static screenshot files (R2 bucket ele-autopilot-screenshots, URL 形如 /screenshots/{job_task_id}/{i}.png)
  route('screenshots/*', 'routes/screenshots.$.tsx'),

  // ele-autopilot-local 发布产物代理 (R2 bucket ele-autopilot-releases, URL 形如 /releases/local/{version}/{file})
  route('releases/local/*', 'routes/releases.local.$.tsx'),

  // ele-autopilot-local 安装脚本 (Worker 动态生成, BASE_URL 自带)
  route('install.sh', 'routes/install-script.tsx'),
] satisfies RouteConfig;
