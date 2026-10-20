import { expect, test } from '@playwright/test'
import { CONCEPT_PATH, waitForHydration } from './helpers'

// 두 프로젝트(desktop 1280px, mobile 375px)에서 모두 가로 스크롤이 생기지 않아야 한다.
for (const path of ['/', '/about', CONCEPT_PATH, '/404']) {
  test(`${path}: 가로 스크롤이 없다`, async ({ page }) => {
    await page.goto(path)
    await waitForHydration(page)
    const { scrollWidth, innerWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }))
    expect(scrollWidth).toBeLessThanOrEqual(innerWidth)
  })
}

test('개념 페이지: 시뮬레이터를 끝까지 진행해도 가로 스크롤이 없다', async ({ page }) => {
  await page.goto(CONCEPT_PATH)
  await waitForHydration(page)
  const region = page.getByRole('region', { name: '원시 값과 객체 시뮬레이터' })
  for (const scenario of ['재할당', '변경', '함수에 전달']) {
    await region.getByRole('radio', { name: scenario }).check()
    const next = region.getByRole('button', { name: '다음' })
    while (await next.isEnabled()) {
      await next.click()
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      )
      expect(overflow).toBeLessThanOrEqual(0)
    }
  }
})
