import js from '@eslint/js'
import { defineConfig, globalIgnores } from 'eslint/config'
import reactHooks from 'eslint-plugin-react-hooks'
import { reactRefresh } from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default defineConfig([
  globalIgnores([
    'build/',
    '.react-router/',
    'node_modules/',
    'app/concepts/*/examples/**',
    'playwright-report/',
    'test-results/',
  ]),
  {
    files: ['**/*.{js,mjs,ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      // React Router 라우트 모듈의 프레임워크 export는 Fast Refresh 검사에서 허용
      reactRefresh.configs.recommended({
        allowExportNames: [
          'meta',
          'links',
          'headers',
          'loader',
          'action',
          'handle',
          'shouldRevalidate',
        ],
      }),
    ],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
])
