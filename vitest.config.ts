import { defineConfig } from 'vitest/config'

// React Router·MDX 플러그인을 쓰지 않는 별도 설정 (테스트는 content.mdx·route.tsx를 import하지 않는다)
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    // *.test.ts는 node, *.test.tsx는 jsdom 환경으로 프로젝트를 나눈다
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          environment: 'node',
          include: ['app/**/*.test.ts', 'tests/*.test.ts'],
          exclude: ['tests/build/**', 'tests/e2e/**', 'node_modules/**'],
        },
      },
      {
        extends: true,
        test: {
          name: 'jsdom',
          environment: 'jsdom',
          include: ['app/**/*.test.tsx'],
          exclude: ['tests/build/**', 'tests/e2e/**', 'node_modules/**'],
          setupFiles: ['./tests/setup.ts'],
        },
      },
    ],
  },
})
