import { defineConfig, devices } from '@playwright/test'

// E2E (L6): `npm run build` 이후 build/client를 serve로 띄워 실제 브라우저(chromium)로 검사한다.
// 서버는 serve.json(trailingSlash: false)을 쓰는 `npm run start`와 같은 설정이다.
const PORT = 4173
const BASE_URL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: BASE_URL,
    locale: 'ko-KR',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
    {
      // WebKit 없이 chromium만 설치하므로 Pixel 7 프로필(chromium 기반)에 뷰포트만 375×812로 맞춘다
      name: 'mobile',
      use: { ...devices['Pixel 7'], viewport: { width: 375, height: 812 } },
    },
  ],
  webServer: {
    command: 'npx serve build/client --config ../../serve.json -l 4173',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
  },
})
