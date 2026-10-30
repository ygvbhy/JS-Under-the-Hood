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
    await expect(cards).toHaveCount(6)
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
    await expect(page.getByRole('article')).toHaveCount(6)
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

  test('홈: 학습 순서 보기로 전환하면 URL과 카드 순서가 바뀌고 검색·뒤로 가기와 함께 유지된다', async ({
    page,
  }) => {
    const errors = collectConsoleErrors(page)
    await page.goto('/')
    await waitForHydration(page)

    const group = page.getByRole('group', { name: '보기 방식' })
    await expect(group.getByRole('button', { name: '분류별' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await group.getByRole('button', { name: '학습 순서' }).click()
    await expect(page).toHaveURL(/\?view=order$/)
    await expect(page.getByRole('heading', { level: 3, name: '학습 순서' })).toBeVisible()

    const cards = page.getByRole('article')
    await expect(cards).toHaveCount(22)
    // 순위(span)와 제목(링크)은 별개 요소이므로 따로 확인한다
    const firstHeading = cards.first().getByRole('heading', { level: 4 })
    await expect(firstHeading).toContainText('1번째')
    await expect(firstHeading.getByRole('link')).toHaveText('원시 값과 객체: 재할당과 변경')
    const lastHeading = cards.last().getByRole('heading', { level: 4 })
    await expect(lastHeading).toContainText('22번째')
    await expect(lastHeading.getByRole('link')).toHaveText(
      'for 문의 let: 반복마다 새 바인딩이 생기는 이유',
    )

    // 검색과 병행: 걸러져도 전체 학습 순서의 순위가 유지된다
    await page.getByRole('searchbox', { name: '개념 검색' }).fill('객체')
    await expect(cards).toHaveCount(6)
    const url = new URL(page.url())
    expect(url.searchParams.get('view')).toBe('order')
    expect(url.searchParams.get('q')).toBe('객체')
    const ranks = await cards
      .getByRole('heading', { level: 4 })
      .evaluateAll((els) => els.map((el) => /^(\d+)번째/.exec(el.textContent ?? '')?.[1]))
    expect(ranks).toEqual(['1', '9', '16', '17', '18', '19'])

    // 카드 → 개념 페이지 → 뒤로 가기: 보기와 검색어가 유지된다
    await cards.first().getByRole('link').click()
    await expect(page).toHaveURL(new RegExp(`${CONCEPT_PATH}$`))
    await page.goBack()
    await waitForHydration(page)
    await expect(page.getByRole('searchbox', { name: '개념 검색' })).toHaveValue('객체')
    await expect(
      page.getByRole('group', { name: '보기 방식' }).getByRole('button', { name: '학습 순서' }),
    ).toHaveAttribute('aria-pressed', 'true')
    await expect(cards).toHaveCount(6)
    expect(errors.messages).toEqual([])
  })

  test('/?view=order 직접 진입 시 학습 순서 보기이고 콘솔 에러가 없다', async ({ page }) => {
    const errors = collectConsoleErrors(page)
    await page.goto('/?view=order')
    await waitForHydration(page)

    await expect(
      page.getByRole('group', { name: '보기 방식' }).getByRole('button', { name: '학습 순서' }),
    ).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('heading', { level: 3, name: '학습 순서' })).toBeVisible()
    await expect(page.getByRole('article')).toHaveCount(22)
    expect(errors.messages).toEqual([])
  })

  test('학습 순서 보기에서 결과가 없으면 학습 순서 목록을 그리지 않는다', async ({ page }) => {
    const errors = collectConsoleErrors(page)
    await page.goto('/?view=order&q=zzz')
    await waitForHydration(page)

    await expect(
      page.getByRole('group', { name: '보기 방식' }).getByRole('button', { name: '학습 순서' }),
    ).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByText('‘zzz’에 맞는 개념이 없습니다.')).toBeVisible()
    await expect(page.getByRole('heading', { level: 3, name: '학습 순서' })).toHaveCount(0)
    await expect(page.getByRole('main').locator('ol')).toHaveCount(0)
    expect(errors.messages).toEqual([])
  })

  test('개념 페이지 하단: 처음·마지막 개념은 한쪽 링크만 있고 중간 개념은 다음으로 이동한다', async ({
    page,
  }) => {
    const errors = collectConsoleErrors(page)

    await page.goto(CONCEPT_PATH)
    await waitForHydration(page)
    let pager = page.getByRole('navigation', { name: '학습 순서' })
    await expect(pager).toContainText('학습 순서 1 / 22')
    await expect(pager.getByRole('link')).toHaveCount(1)
    await expect(pager.getByRole('link')).toHaveAttribute(
      'href',
      '/concepts/short-circuit-evaluation',
    )

    await page.goto('/concepts/closure')
    await waitForHydration(page)
    pager = page.getByRole('navigation', { name: '학습 순서' })
    await expect(pager).toContainText('학습 순서 21 / 22')
    await expect(pager.getByRole('link')).toHaveCount(2)
    await expect(pager.getByRole('link', { name: /이전 개념/ })).toHaveAttribute(
      'href',
      '/concepts/execution-context',
    )
    await expect(pager.getByRole('link', { name: /다음 개념/ })).toHaveAttribute(
      'href',
      '/concepts/for-let',
    )

    await page.goto('/concepts/for-let')
    await waitForHydration(page)
    pager = page.getByRole('navigation', { name: '학습 순서' })
    await expect(pager).toContainText('학습 순서 22 / 22')
    await expect(pager.getByRole('link')).toHaveCount(1)
    await expect(pager.getByRole('link')).toHaveAttribute('href', '/concepts/closure')

    await page.goto('/concepts/hoisting')
    await waitForHydration(page)
    pager = page.getByRole('navigation', { name: '학습 순서' })
    await expect(pager.getByRole('link')).toHaveCount(2)
    await expect(pager.getByRole('link', { name: /이전 개념/ })).toHaveAttribute(
      'href',
      '/concepts/function-calls',
    )
    await pager.getByRole('link', { name: /다음 개념/ }).click()
    await expect(page).toHaveURL(/\/concepts\/scope-chain$/)
    expect(errors.messages).toEqual([])
  })
})
