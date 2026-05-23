import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
} from 'react-router';
import type { Route } from './+types/root';

import './globals.css';

export function links() {
  return [
    { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
    { rel: 'alternate icon', href: '/favicon.ico', sizes: 'any' },
    { rel: 'apple-touch-icon', href: '/apple-touch-icon.png', sizes: '180x180' },
    { rel: 'mask-icon', href: '/favicon.svg', color: '#0969da' },
    // manifest 默认 credentials=omit 同源也不带 cookie -> 被 CF Access 302 跳登录页 -> CORS 阻断; 必须 use-credentials.
    { rel: 'manifest', href: '/site.webmanifest', crossOrigin: 'use-credentials' },
  ];
}

export function meta() {
  return [
    { title: 'QA AutoPilot · 任务后台' },
    { name: 'description', content: 'QA AutoPilot 任务后台 — 编排测试任务并派单到本地 agent.' },
  ];
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" style={{ colorScheme: 'light' }} suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <Meta />
        <Links />
        {import.meta.env.DEV && <script src="http://localhost:8097" async />}
      </head>
      <body className="antialiased" suppressHydrationWarning>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = '出错了';
  let details = '发生了未预期的错误.';
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? '404' : '错误';
    details =
      error.status === 404 ? '请求的页面不存在.' : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="container mx-auto p-4 pt-16">
      <h1 className="text-2xl font-semibold">{message}</h1>
      <p className="text-gray-600">{details}</p>
      {stack && (
        <pre className="w-full overflow-x-auto p-4 text-xs">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
