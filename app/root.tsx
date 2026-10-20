import { Links, Meta, Outlet, Scripts, ScrollRestoration, isRouteErrorResponse } from 'react-router'
import type { Route } from './+types/root'
import './app.css'
import { SiteFooter } from './components/site/SiteFooter'
import { SiteHeader } from './components/site/SiteHeader'
import { SkipLink } from './components/site/SkipLink'

export const links: Route.LinksFunction = () => [
  { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
]

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="flex min-h-screen flex-col">
        <SkipLink />
        <SiteHeader />
        <main
          id="main"
          tabIndex={-1}
          className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 focus:outline-none"
        >
          {children}
        </main>
        <SiteFooter />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}

export default function App() {
  return <Outlet />
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const detail = isRouteErrorResponse(error) ? `${error.status} ${error.statusText}`.trim() : null
  return (
    <div role="alert">
      <h1 className="text-2xl font-bold">문제가 발생했습니다</h1>
      <p className="text-muted mt-4">
        페이지를 표시하는 중 오류가 생겼습니다. 새로고침하거나 잠시 후 다시 시도해 주세요.
      </p>
      {detail && <p className="text-muted mt-2 text-sm">{detail}</p>}
      <p className="mt-6">
        <a href="/" className="text-accent underline underline-offset-4">
          홈으로 돌아가기
        </a>
      </p>
    </div>
  )
}
