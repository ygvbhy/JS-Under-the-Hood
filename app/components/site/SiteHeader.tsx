import { Link, NavLink } from 'react-router'
import { SITE_NAME } from '~/lib/site'

const NAV_ITEMS = [
  { to: '/', label: '홈', end: true },
  { to: '/about', label: '소개', end: false },
]

export function SiteHeader() {
  return (
    <header className="border-border border-b">
      <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3">
        <Link to="/" className="text-fg text-lg font-bold">
          {SITE_NAME}
        </Link>
        <nav aria-label="주 메뉴">
          <ul className="flex gap-4">
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `py-1 underline-offset-4 hover:underline ${
                      isActive ? 'text-accent font-semibold underline' : 'text-muted'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  )
}
