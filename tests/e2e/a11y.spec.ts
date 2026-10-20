import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { CONCEPT_PATH, SIMULATOR_NAME, waitForHydration } from './helpers'

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

// critical·serious 위반만 실패로 본다. 위반 내용은 실패 메시지에 요약해 보여 준다.
async function expectNoSeriousViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze()
  const serious = violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')
  const summary = serious.map((v) => ({
    id: v.id,
    impact: v.impact,
    help: v.help,
    nodes: v.nodes.map((n) => ({
      target: n.target,
      summary: n.failureSummary,
    })),
  }))
  expect(summary, JSON.stringify(summary, null, 2)).toEqual([])
}

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`axe (${colorScheme})`, () => {
    test.use({ colorScheme })

    test('홈', async ({ page }) => {
      await page.goto('/')
      await waitForHydration(page)
      await expectNoSeriousViolations(page)
    })

    test('홈: 검색 결과 / 결과 없음', async ({ page }) => {
      await page.goto('/?q=' + encodeURIComponent('객체'))
      await waitForHydration(page)
      await expectNoSeriousViolations(page)
      await page.goto('/?q=zzz')
      await waitForHydration(page)
      await expectNoSeriousViolations(page)
    })

    test('개념 페이지', async ({ page }) => {
      await page.goto(CONCEPT_PATH)
      await waitForHydration(page)
      await expect(page.getByRole('button', { name: '정답 확인' }).first()).toBeVisible()
      await expectNoSeriousViolations(page)
    })

    test('개념 페이지: 시뮬레이터를 진행한 뒤', async ({ page }) => {
      await page.goto(CONCEPT_PATH)
      await waitForHydration(page)
      const region = page.getByRole('region', { name: SIMULATOR_NAME })
      for (const scenario of ['재할당', '변경', '함수에 전달']) {
        await region.getByRole('radio', { name: scenario }).check()
        const next = region.getByRole('button', { name: '다음' })
        // 변경됨 배지, 접근할 수 없는 객체 등 단계마다 달라지는 표시를 모두 검사한다
        for (let i = 0; i < 8 && (await next.isEnabled()); i++) {
          await next.click()
          await expectNoSeriousViolations(page)
        }
      }
    })

    test('개념 페이지: 퀴즈 정답을 공개한 뒤', async ({ page }) => {
      await page.goto(CONCEPT_PATH)
      await waitForHydration(page)
      const quiz = page.getByRole('group', { name: /예제 1의 출력은 무엇일까요/ })
      await quiz.getByRole('radio').nth(1).check() // 오답 표시(✗)까지 검사
      await quiz.locator('..').getByRole('button', { name: '정답 확인' }).click()
      await expect(page.getByText('오답입니다. 정답은 1번입니다.')).toBeVisible()
      await expectNoSeriousViolations(page)
    })
  })
}

test.describe('axe (기본 색상 모드)', () => {
  test('소개', async ({ page }) => {
    await page.goto('/about')
    await waitForHydration(page)
    await expectNoSeriousViolations(page)
  })

  test('404', async ({ page }) => {
    await page.goto('/does-not-exist')
    await waitForHydration(page)
    await expectNoSeriousViolations(page)
  })
})
