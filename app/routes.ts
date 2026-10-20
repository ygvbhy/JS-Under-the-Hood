import { type RouteConfig, getAppDirectory, index, route } from '@react-router/dev/routes'
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const conceptsDir = join(getAppDirectory(), 'concepts')
const slugs = readdirSync(conceptsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(join(conceptsDir, d.name, 'route.tsx')))
  .map((d) => d.name)
  .sort()

export default [
  index('routes/home.tsx'),
  route('about', 'routes/about.tsx'),
  ...slugs.map((slug) => route(`concepts/${slug}`, `concepts/${slug}/route.tsx`)),
  route('*', 'routes/not-found.tsx'),
] satisfies RouteConfig
