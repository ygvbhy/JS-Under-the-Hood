import { defineConfig } from 'vitest/config'

// React Router·MDX 플러그인을 쓰지 않는 별도 설정 (테스트는 content.mdx·route.tsx를 import하지 않는다)
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    // import.meta.glob(개념 레지스트리)은 변환 시점에 파일 목록이 박힌다. 변환 캐시를 쓰면
    // 개념 폴더를 추가·삭제해도 테스트가 옛 목록을 보므로 끈다(Vitest 5 기본값은 true).
    fsModuleCache: false,
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
