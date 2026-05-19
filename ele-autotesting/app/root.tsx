import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "react-router";

import type { Route } from "./+types/root";
import { ServicesProvider } from "./providers/ServicesProvider";
import { ThemeProvider, type ThemeMode } from "./providers/ThemeProvider";
import { ToastProvider } from "./providers/ToastProvider";
import { Header } from "./components/Header";

import "./styles/index.css";

export const links: Route.LinksFunction = () => [
  { rel: "icon", href: "/favicon.ico", sizes: "any" },
];

export function loader({ request }: Route.LoaderArgs) {
  const cookie = request.headers.get("Cookie") || "";
  const match = cookie.match(/(?:^|; )theme=([^;]+)/);
  let initialTheme: ThemeMode = "system";
  if (match) {
    const v = decodeURIComponent(match[1]);
    if (v === "light" || v === "dark" || v === "system") initialTheme = v;
  }
  return { initialTheme };
}

const THEME_INIT_SCRIPT = `(function(){try{var t=document.cookie.match(/(?:^|; )theme=([^;]+)/);var v=t?decodeURIComponent(t[1]):'system';var dark=v==='dark'||(v==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',dark);document.documentElement.dataset.theme=v;}catch(e){}})();`;

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>QA AutoPilot · AutoTest</title>
        <Meta />
        <Links />
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const { initialTheme } = useLoaderData<typeof loader>();
  return (
    <ThemeProvider initialTheme={initialTheme}>
      <ToastProvider>
        <ServicesProvider>
          <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1 min-h-0 flex flex-col">
              <Outlet />
            </main>
          </div>
        </ServicesProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "未预期的错误";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404 ? "请求的页面不存在." : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-2">{message}</h1>
      <p className="text-base mb-4">{details}</p>
      {stack ? (
        <pre className="text-xs overflow-auto rounded border p-2">
          <code>{stack}</code>
        </pre>
      ) : null}
    </main>
  );
}
