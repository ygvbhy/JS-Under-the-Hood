# JS Under the Hood

자바스크립트 코드가 "왜 그렇게 동작하는지"를 눈으로 확인하는 한국어 학습 사이트입니다. 개념 하나가 독립된 URL 하나이고, 각 페이지는 원리 설명, 결과 예측 퀴즈, 단계별 시뮬레이터로 구성됩니다. 모든 "실행 결과" 주장은 테스트가 예제를 실제로 실행해 검증하고, 단순화한 부분은 페이지에 명시합니다.

## 스택

- Vite 기반 React Router Framework mode (프리렌더, `ssr: false`) + React 19
- MDX(`@mdx-js/rollup`) + Shiki 코드 하이라이트, Tailwind CSS 4
- TypeScript, ESLint, Prettier
- Vitest(단위·예제 실행·콘텐츠 무결성), Playwright + axe(E2E·접근성)
- 배포: Vercel 정적 호스팅 (백엔드·DB 없음)

## 빠른 시작

Node 22.22 이상이 필요합니다(`.nvmrc`는 24).

```bash
npm ci
npm run dev
```

개발 서버는 http://localhost:5173 에서 열립니다. 새 개념 폴더를 추가하면 개발 서버를 재시작해야 합니다.

## 스크립트

| 명령어                | 설명                                              |
| --------------------- | ------------------------------------------------- |
| `npm run dev`         | 개발 서버                                         |
| `npm run build`       | 프리렌더 정적 빌드 (`build/client`)               |
| `npm run start`       | 빌드 결과를 로컬에서 정적 서빙                    |
| `npm run typecheck`   | 타입 검사                                         |
| `npm run lint`        | ESLint                                            |
| `npm run format`      | Prettier로 포맷 (`format:check`는 검사만)         |
| `npm test`            | Vitest (예제 실제 실행, 메타 무결성, 단위 테스트) |
| `npm run test:build`  | 빌드 후 HTML·SEO·sitemap·404 검사                 |
| `npm run e2e`         | Playwright E2E + 접근성 검사 (먼저 build 필요)    |
| `npm run og:generate` | 공유용 OG 이미지 재생성                           |

작업을 마치기 전 검증 순서는 [AGENTS.md](AGENTS.md#검증-순서)를 따릅니다. E2E를 처음 돌릴 때는 `npx playwright install chromium`이 필요합니다.

## 문서

- [AGENTS.md](AGENTS.md): 프로젝트 규칙(정확성 원칙, 디렉터리 구조, 하이드레이션·예제·시뮬레이터 규칙, 명령어, 배포)
- [docs/content-guide.md](docs/content-guide.md): 새 개념 추가 절차, 작성 규칙, 검토 체크리스트
- 설계와 구현 기록: `.claude/plans/`

## 배포 (Vercel)

설정은 `vercel.json`에 있습니다(`framework: null`, `npm ci`, `npm run build`, 출력 `build/client`, `/assets/*` immutable 캐시). main 브랜치가 Production, PR이 Preview 배포입니다.

처음 배포할 때 직접 할 일:

1. 이 저장소를 GitHub에 올립니다.
2. Vercel에서 **Add New → Project**로 GitHub 저장소를 Import합니다. Framework Preset은 "Other"로 두면 됩니다(`vercel.json`이 `framework: null`로 고정합니다).
3. Environment Variables에 `VITE_SITE_URL`을 Production 값으로 실제 서비스 도메인(예: `https://example.com`, 끝에 `/` 없이)으로 설정합니다. canonical, og:url, `sitemap.xml`, `robots.txt`의 절대 URL이 이 값으로 만들어집니다. 설정하지 않으면 커밋된 `.env`의 기본값이 쓰입니다.
4. Deploy 후 Preview/Production URL에서 `/`, `/about`, 개념 페이지가 200, 없는 경로가 404(커스텀 404 본문)인지 확인합니다.
