import AdminTaskExplorerPage from '@/app/admin/_components/admin-task-explorer-page';

export function meta() {
  return [{ title: '任务后台 · QA AutoPilot' }];
}

export default function AdminIndexRoute() {
  return <AdminTaskExplorerPage />;
}
