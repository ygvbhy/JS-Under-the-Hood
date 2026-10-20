import { defineConfig } from 'vitest/config'

// 빌드 결과 검사 전용 (npm run test:build). 먼저 `npm run build`가 실행되어 있어야 한다.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'node',
    include: ['tests/build/**/*.test.ts'],
  },
})
