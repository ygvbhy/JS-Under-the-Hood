import { defineConfig } from 'vitest/config'

// 빌드 결과 검사 전용 (npm run test:build). 먼저 `npm run build`가 실행되어 있어야 한다.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    // import.meta.glob(개념 레지스트리)은 변환 시점에 파일 목록이 박힌다. 변환 캐시를 쓰면
    // 개념 폴더를 추가·삭제해도 테스트가 옛 목록을 보므로 끈다(Vitest 5 기본값은 true).
    fsModuleCache: false,
    environment: 'node',
    include: ['tests/build/**/*.test.ts'],
  },
})
