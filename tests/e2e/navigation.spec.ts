import { expect, test } from '@playwright/test'
import { CONCEPT_PATH, collectConsoleErrors, waitForHydration } from './helpers'

test.describe('내비게이션', () => {
  test('홈 → 검색 → 카드 클릭 → 개념 페이지', async ({ page }) => {
    const errors = collectConsoleErrors(page)
    await page.goto('/')
    await waitForHydration(page)

    const cards = page.getByRole('article')
    await expect(cards.first()).toBeVisible()

    const search = page.getByRole('searchbox', { name: '개념 검색' })
    await search.fill('객체')
    await expect(page).toHaveURL(/\?q=/)
    expect(new URL(page.url()).searchParams.get('q')).toBe('객체')
    await expect(cards).toHaveCount(3)
    await expect(cards.first()).toContainText('원시 값과 객체')

    await cards.first().getByRole('link').click()
    await expect(page).toHaveURL(new RegExp(`${CONCEPT_PATH}$`))
    await expect(page.getByRole('heading', { level: 1 })).toContainText('원시 값과 객체')
    expect(errors.messages).toEqual([])
  })

  test('/?q=객체 직접 진입 시 입력값과 결과가 유지되고 콘솔 에러가 없다', async ({ page }) => {
    const errors = collectConsoleErrors(page)
    await page.goto('/?q=' + encodeURIComponent('객체'))
    await waitForHydration(page)

    await expect(page.getByRole('searchbox', { name: '개념 검색' })).toHaveValue('객체')
    await expect(page.getByRole('article')).toHaveCount(3)
    expect(errors.messages).toEqual([])
  })

  test('/?q=zzz 는 결과 없음 문구를 보여 준다', async ({ page }) => {
    const errors = collectConsoleErrors(page)
    await page.goto('/?q=zzz')
    await waitForHydration(page)

    await expect(page.getByText('‘zzz’에 맞는 개념이 없습니다.')).toBeVisible()
    await expect(page.getByRole('article')).toHaveCount(0)
    expect(errors.messages).toEqual([])
  })

  test('없는 주소는 404 상태와 404 페이지를 보여 주고 홈으로 돌아갈 수 있다', async ({ page }) => {
    const errors = collectConsoleErrors(page, { ignore404Resource: true })
    const response = await page.goto('/does-not-exist')
    expect(response?.status()).toBe(404)
    await waitForHydration(page)

    await expect(
      page.getByRole('heading', { level: 1, name: '페이지를 찾을 수 없습니다' }),
    ).toBeVisible()
    await page.getByRole('link', { name: '홈으로 돌아가기' }).click()
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('heading', { level: 1, name: 'JS Under the Hood' })).toBeVisible()
    expect(errors.messages).toEqual([])
  })
})
