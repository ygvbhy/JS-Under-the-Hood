import { expect, test } from '@playwright/test'
import { CONCEPT_PATH } from './helpers'

// JS가 꺼진 환경에서도 프리렌더 HTML만으로 본문·코드·퀴즈 정답을 볼 수 있어야 한다.
test.describe('JS 비활성', () => {
  test.skip(({ isMobile }) => isMobile, '데스크톱 프로젝트 전용')
  test.use({ javaScriptEnabled: false })

  test('개념 페이지의 본문·코드·정답·시뮬레이터 0단계를 볼 수 있다', async ({ page }) => {
    await page.goto(CONCEPT_PATH)

    await expect(page.getByRole('heading', { level: 2, name: '동작 원리' })).toBeVisible()
    await expect(page.getByText('자바스크립트의 값은', { exact: false }).first()).toBeVisible()

    // Shiki 코드 블록
    const code = page.locator('pre.shiki').first()
    await expect(code).toBeVisible()
    await expect(code).toContainText('let a = 10')

    // 정답은 <details>로 열람
    const details = page.locator('details', { hasText: '정답 보기' }).first()
    const answer = details.getByText(/정답: 1번/)
    await expect(answer).toBeHidden()
    await details.locator('summary').click()
    await expect(answer).toBeVisible()
    await expect(details.getByText(/b와 q는 재할당되었을 뿐이므로/)).toBeVisible()

    // 시뮬레이터 단계 0 (정적 마크업)
    const simulator = page.getByRole('region', { name: '원시 값과 객체 시뮬레이터' })
    await expect(
      simulator.getByText('코드를 실행하기 전입니다', { exact: false }).first(),
    ).toBeVisible()
    await expect(simulator.getByText('(아직 출력 없음)')).toBeVisible()
  })

  test('홈의 개념 목록과 링크가 보인다', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('link', { name: /원시 값과 객체/ })).toBeVisible()
  })
})
