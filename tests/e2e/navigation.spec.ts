import { expect, test } from '@playwright/test'
import {
  AUTOMATIC_SEMICOLON_INSERTION_PATH,
  MATH_PATH,
  RELATIONAL_COMPARISON_PATH,
  SWITCH_LET_PATH,
  MUTATION_OBSERVER_PATH,
  UNCAUGHT_EXCEPTIONS_PATH,
  CONCEPT_PATH,
  DATA_TYPES_PATH,
  EXPRESSIONS_STATEMENTS_PATH,
  FUNCTION_DEFINITIONS_PATH,
  FUNCTION_NAME_PATH,
  TO_PRIMITIVE_PATH,
  VARIABLE_DECLARATION_PATH,
  collectConsoleErrors,
  waitForHydration,
} from './helpers'

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
    await expect(cards).toHaveCount(19)
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
    await expect(page.getByRole('article')).toHaveCount(19)
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
    await expect(cards).toHaveCount(81)
    // 순위(span)와 제목(링크)은 별개 요소이므로 따로 확인한다
    const firstHeading = cards.first().getByRole('heading', { level: 4 })
    await expect(firstHeading).toContainText('1번째')
    await expect(firstHeading.getByRole('link')).toHaveText(
      '변수 선언과 할당: 선언만 한 변수는 왜 undefined일까',
    )
    const lastHeading = cards.last().getByRole('heading', { level: 4 })
    await expect(lastHeading).toContainText('81번째')
    await expect(lastHeading.getByRole('link')).toHaveText(
      'ES 모듈: import한 변수는 왜 저절로 바뀔까',
    )

    // 검색과 병행: 걸러져도 전체 학습 순서의 순위가 유지된다
    await page.getByRole('searchbox', { name: '개념 검색' }).fill('객체')
    await expect(cards).toHaveCount(19)
    const url = new URL(page.url())
    expect(url.searchParams.get('view')).toBe('order')
    expect(url.searchParams.get('q')).toBe('객체')
    const ranks = await cards
      .getByRole('heading', { level: 4 })
      .evaluateAll((els) => els.map((el) => /^(\d+)번째/.exec(el.textContent ?? '')?.[1]))
    expect(ranks).toEqual([
      '4',
      '13',
      '23',
      '24',
      '25',
      '26',
      '28',
      '29',
      '31',
      '33',
      '35',
      '36',
      '41',
      '53',
      '54',
      '56',
      '57',
      '68',
      '76',
    ])

    // 카드 → 개념 페이지 → 뒤로 가기: 보기와 검색어가 유지된다
    await cards.first().getByRole('link').click()
    await expect(page).toHaveURL(new RegExp(`${CONCEPT_PATH}$`))
    await page.goBack()
    await waitForHydration(page)
    await expect(page.getByRole('searchbox', { name: '개념 검색' })).toHaveValue('객체')
    await expect(
      page.getByRole('group', { name: '보기 방식' }).getByRole('button', { name: '학습 순서' }),
    ).toHaveAttribute('aria-pressed', 'true')
    await expect(cards).toHaveCount(19)
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
    await expect(page.getByRole('article')).toHaveCount(81)
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

    await page.goto(VARIABLE_DECLARATION_PATH)
    await waitForHydration(page)
    let pager = page.getByRole('navigation', { name: '학습 순서' })
    await expect(pager).toContainText('학습 순서 1 / 81')
    await expect(pager.getByRole('link')).toHaveCount(1)
    await expect(pager.getByRole('link')).toHaveAttribute('href', EXPRESSIONS_STATEMENTS_PATH)

    await page.goto(CONCEPT_PATH)
    await waitForHydration(page)
    pager = page.getByRole('navigation', { name: '학습 순서' })
    await expect(pager).toContainText('학습 순서 4 / 81')
    await expect(pager.getByRole('link')).toHaveCount(2)
    await expect(pager.getByRole('link', { name: /이전 개념/ })).toHaveAttribute(
      'href',
      DATA_TYPES_PATH,
    )
    await expect(pager.getByRole('link', { name: /다음 개념/ })).toHaveAttribute(
      'href',
      '/concepts/short-circuit-evaluation',
    )

    await page.goto(RELATIONAL_COMPARISON_PATH)
    await waitForHydration(page)
    pager = page.getByRole('navigation', { name: '학습 순서' })
    await expect(pager).toContainText('학습 순서 8 / 81')
    await expect(pager.getByRole('link')).toHaveCount(2)
    await expect(pager.getByRole('link', { name: /이전 개념/ })).toHaveAttribute(
      'href',
      '/concepts/equality-operators',
    )
    await expect(pager.getByRole('link', { name: /다음 개념/ })).toHaveAttribute(
      'href',
      '/concepts/number-type',
    )

    await page.goto('/concepts/closure')
    await waitForHydration(page)
    pager = page.getByRole('navigation', { name: '학습 순서' })
    await expect(pager).toContainText('학습 순서 32 / 81')
    await expect(pager.getByRole('link')).toHaveCount(2)
    await expect(pager.getByRole('link', { name: /이전 개념/ })).toHaveAttribute(
      'href',
      '/concepts/global-object',
    )
    await expect(pager.getByRole('link', { name: /다음 개념/ })).toHaveAttribute(
      'href',
      '/concepts/iife-module-pattern',
    )

    await page.goto('/concepts/for-let')
    await waitForHydration(page)
    pager = page.getByRole('navigation', { name: '학습 순서' })
    await expect(pager).toContainText('학습 순서 34 / 81')
    await expect(pager.getByRole('link')).toHaveCount(2)
    await expect(pager.getByRole('link', { name: /이전 개념/ })).toHaveAttribute(
      'href',
      '/concepts/iife-module-pattern',
    )
    await expect(pager.getByRole('link', { name: /다음 개념/ })).toHaveAttribute(
      'href',
      '/concepts/class-basics',
    )

    await page.goto('/concepts/class-basics')
    await waitForHydration(page)
    pager = page.getByRole('navigation', { name: '학습 순서' })
    await expect(pager).toContainText('학습 순서 35 / 81')
    await expect(pager.getByRole('link')).toHaveCount(2)
    await expect(pager.getByRole('link', { name: /이전 개념/ })).toHaveAttribute(
      'href',
      '/concepts/for-let',
    )
    await expect(pager.getByRole('link', { name: /다음 개념/ })).toHaveAttribute(
      'href',
      '/concepts/class-inheritance',
    )

    await page.goto('/concepts/class-inheritance')
    await waitForHydration(page)
    pager = page.getByRole('navigation', { name: '학습 순서' })
    await expect(pager).toContainText('학습 순서 36 / 81')
    await expect(pager.getByRole('link')).toHaveCount(2)
    await expect(pager.getByRole('link', { name: /이전 개념/ })).toHaveAttribute(
      'href',
      '/concepts/class-basics',
    )
    await expect(pager.getByRole('link', { name: /다음 개념/ })).toHaveAttribute(
      'href',
      '/concepts/class-accessors',
    )

    await page.goto('/concepts/class-accessors')
    await waitForHydration(page)
    pager = page.getByRole('navigation', { name: '학습 순서' })
    await expect(pager).toContainText('학습 순서 37 / 81')
    await expect(pager.getByRole('link')).toHaveCount(2)
    await expect(pager.getByRole('link', { name: /이전 개념/ })).toHaveAttribute(
      'href',
      '/concepts/class-inheritance',
    )
    await expect(pager.getByRole('link', { name: /다음 개념/ })).toHaveAttribute(
      'href',
      '/concepts/arrow-functions',
    )

    await page.goto('/concepts/arrow-functions')
    await waitForHydration(page)
    pager = page.getByRole('navigation', { name: '학습 순서' })
    await expect(pager).toContainText('학습 순서 38 / 81')
    await expect(pager.getByRole('link')).toHaveCount(2)
    await expect(pager.getByRole('link', { name: /이전 개념/ })).toHaveAttribute(
      'href',
      '/concepts/class-accessors',
    )
    await expect(pager.getByRole('link', { name: /다음 개념/ })).toHaveAttribute(
      'href',
      '/concepts/default-parameters',
    )

    await page.goto('/concepts/default-parameters')
    await waitForHydration(page)
    pager = page.getByRole('navigation', { name: '학습 순서' })
    await expect(pager).toContainText('학습 순서 39 / 81')
    await expect(pager.getByRole('link')).toHaveCount(2)
    await expect(pager.getByRole('link', { name: /이전 개념/ })).toHaveAttribute(
      'href',
      '/concepts/arrow-functions',
    )
    await expect(pager.getByRole('link', { name: /다음 개념/ })).toHaveAttribute(
      'href',
      '/concepts/function-name',
    )

    await page.goto(FUNCTION_NAME_PATH)
    await waitForHydration(page)
    pager = page.getByRole('navigation', { name: '학습 순서' })
    await expect(pager).toContainText('학습 순서 40 / 81')
    await expect(pager.getByRole('link')).toHaveCount(2)
    await expect(pager.getByRole('link', { name: /이전 개념/ })).toHaveAttribute(
      'href',
      '/concepts/default-parameters',
    )
    await expect(pager.getByRole('link', { name: /다음 개념/ })).toHaveAttribute(
      'href',
      '/concepts/array-index-length',
    )

    await page.goto('/concepts/array-index-length')
    await waitForHydration(page)
    pager = page.getByRole('navigation', { name: '학습 순서' })
    await expect(pager).toContainText('학습 순서 41 / 81')
    await expect(pager.getByRole('link')).toHaveCount(2)
    await expect(pager.getByRole('link', { name: /이전 개념/ })).toHaveAttribute(
      'href',
      '/concepts/function-name',
    )
    await expect(pager.getByRole('link', { name: /다음 개념/ })).toHaveAttribute(
      'href',
      '/concepts/array-method-pitfalls',
    )

    await page.goto('/concepts/array-method-pitfalls')
    await waitForHydration(page)
    pager = page.getByRole('navigation', { name: '학습 순서' })
    await expect(pager).toContainText('학습 순서 42 / 81')
    await expect(pager.getByRole('link')).toHaveCount(2)
    await expect(pager.getByRole('link', { name: /이전 개념/ })).toHaveAttribute(
      'href',
      '/concepts/array-index-length',
    )
    await expect(pager.getByRole('link', { name: /다음 개념/ })).toHaveAttribute(
      'href',
      '/concepts/array-higher-order-functions',
    )

    await page.goto('/concepts/array-higher-order-functions')
    await waitForHydration(page)
    pager = page.getByRole('navigation', { name: '학습 순서' })
    await expect(pager).toContainText('학습 순서 43 / 81')
    await expect(pager.getByRole('link')).toHaveCount(2)
    await expect(pager.getByRole('link', { name: /이전 개념/ })).toHaveAttribute(
      'href',
      '/concepts/array-method-pitfalls',
    )
    await expect(pager.getByRole('link', { name: /다음 개념/ })).toHaveAttribute(
      'href',
      '/concepts/number-pitfalls',
    )

    await page.goto('/concepts/number-pitfalls')
    await waitForHydration(page)
    pager = page.getByRole('navigation', { name: '학습 순서' })
    await expect(pager).toContainText('학습 순서 44 / 81')
    await expect(pager.getByRole('link')).toHaveCount(2)
    await expect(pager.getByRole('link', { name: /이전 개념/ })).toHaveAttribute(
      'href',
      '/concepts/array-higher-order-functions',
    )
    await expect(pager.getByRole('link', { name: /다음 개념/ })).toHaveAttribute(
      'href',
      '/concepts/bigint',
    )

    await page.goto('/concepts/bigint')
    await waitForHydration(page)
    pager = page.getByRole('navigation', { name: '학습 순서' })
    await expect(pager).toContainText('학습 순서 45 / 81')
    await expect(pager.getByRole('link')).toHaveCount(2)
    await expect(pager.getByRole('link', { name: /이전 개념/ })).toHaveAttribute(
      'href',
      '/concepts/number-pitfalls',
    )
    await expect(pager.getByRole('link', { name: /다음 개념/ })).toHaveAttribute(
      'href',
      '/concepts/date',
    )

    await page.goto('/concepts/date')
    await waitForHydration(page)
    pager = page.getByRole('navigation', { name: '학습 순서' })
    await expect(pager).toContainText('학습 순서 46 / 81')
    await expect(pager.getByRole('link')).toHaveCount(2)
    await expect(pager.getByRole('link', { name: /이전 개념/ })).toHaveAttribute(
      'href',
      '/concepts/bigint',
    )
    await expect(pager.getByRole('link', { name: /다음 개념/ })).toHaveAttribute(
      'href',
      '/concepts/math',
    )

    await page.goto(MATH_PATH)
    await waitForHydration(page)
    pager = page.getByRole('navigation', { name: '학습 순서' })
    await expect(pager).toContainText('학습 순서 47 / 81')
    await expect(pager.getByRole('link')).toHaveCount(2)
    await expect(pager.getByRole('link', { name: /이전 개념/ })).toHaveAttribute(
      'href',
      '/concepts/date',
    )
    await expect(pager.getByRole('link', { name: /다음 개념/ })).toHaveAttribute(
      'href',
      '/concepts/regexp-lastindex',
    )

    await page.goto('/concepts/regexp-lastindex')
    await waitForHydration(page)
    pager = page.getByRole('navigation', { name: '학습 순서' })
    await expect(pager).toContainText('학습 순서 48 / 81')
    await expect(pager.getByRole('link')).toHaveCount(2)
    await expect(pager.getByRole('link', { name: /이전 개념/ })).toHaveAttribute(
      'href',
      '/concepts/math',
    )
    await expect(pager.getByRole('link', { name: /다음 개념/ })).toHaveAttribute(
      'href',
      '/concepts/string-utf16',
    )

    await page.goto('/concepts/string-utf16')
    await waitForHydration(page)
    pager = page.getByRole('navigation', { name: '학습 순서' })
    await expect(pager).toContainText('학습 순서 49 / 81')
    await expect(pager.getByRole('link')).toHaveCount(2)
    await expect(pager.getByRole('link', { name: /이전 개념/ })).toHaveAttribute(
      'href',
      '/concepts/regexp-lastindex',
    )
    await expect(pager.getByRole('link', { name: /다음 개념/ })).toHaveAttribute(
      'href',
      '/concepts/tagged-templates',
    )

    await page.goto('/concepts/tagged-templates')
    await waitForHydration(page)
    pager = page.getByRole('navigation', { name: '학습 순서' })
    await expect(pager).toContainText('학습 순서 50 / 81')
    await expect(pager.getByRole('link')).toHaveCount(2)
    await expect(pager.getByRole('link', { name: /이전 개념/ })).toHaveAttribute(
      'href',
      '/concepts/string-utf16',
    )
    await expect(pager.getByRole('link', { name: /다음 개념/ })).toHaveAttribute(
      'href',
      '/concepts/string-replace-split',
    )

    await page.goto('/concepts/string-replace-split')
    await waitForHydration(page)
    pager = page.getByRole('navigation', { name: '학습 순서' })
    await expect(pager).toContainText('학습 순서 51 / 81')
    await expect(pager.getByRole('link')).toHaveCount(2)
    await expect(pager.getByRole('link', { name: /이전 개념/ })).toHaveAttribute(
      'href',
      '/concepts/tagged-templates',
    )
    await expect(pager.getByRole('link', { name: /다음 개념/ })).toHaveAttribute(
      'href',
      '/concepts/symbol',
    )

    await page.goto('/concepts/symbol')
    await waitForHydration(page)
    pager = page.getByRole('navigation', { name: '학습 순서' })
    await expect(pager).toContainText('학습 순서 52 / 81')
    await expect(pager.getByRole('link')).toHaveCount(2)
    await expect(pager.getByRole('link', { name: /이전 개념/ })).toHaveAttribute(
      'href',
      '/concepts/string-replace-split',
    )
    await expect(pager.getByRole('link', { name: /다음 개념/ })).toHaveAttribute(
      'href',
      '/concepts/to-primitive',
    )

    await page.goto(TO_PRIMITIVE_PATH)
    await waitForHydration(page)
    pager = page.getByRole('navigation', { name: '학습 순서' })
    await expect(pager).toContainText('학습 순서 53 / 81')
    await expect(pager.getByRole('link')).toHaveCount(2)
    await expect(pager.getByRole('link', { name: /이전 개념/ })).toHaveAttribute(
      'href',
      '/concepts/symbol',
    )
    await expect(pager.getByRole('link', { name: /다음 개념/ })).toHaveAttribute(
      'href',
      '/concepts/iterable-for-of',
    )

    await page.goto('/concepts/iterable-for-of')
    await waitForHydration(page)
    pager = page.getByRole('navigation', { name: '학습 순서' })
    await expect(pager).toContainText('학습 순서 54 / 81')
    await expect(pager.getByRole('link')).toHaveCount(2)
    await expect(pager.getByRole('link', { name: /이전 개념/ })).toHaveAttribute(
      'href',
      '/concepts/to-primitive',
    )
    await expect(pager.getByRole('link', { name: /다음 개념/ })).toHaveAttribute(
      'href',
      '/concepts/match-all',
    )

    await page.goto('/concepts/match-all')
    await waitForHydration(page)
    pager = page.getByRole('navigation', { name: '학습 순서' })
    await expect(pager).toContainText('학습 순서 55 / 81')
    await expect(pager.getByRole('link')).toHaveCount(2)
    await expect(pager.getByRole('link', { name: /이전 개념/ })).toHaveAttribute(
      'href',
      '/concepts/iterable-for-of',
    )
    await expect(pager.getByRole('link', { name: /다음 개념/ })).toHaveAttribute(
      'href',
      '/concepts/spread-destructuring',
    )

    await page.goto('/concepts/spread-destructuring')
    await waitForHydration(page)
    pager = page.getByRole('navigation', { name: '학습 순서' })
    await expect(pager).toContainText('학습 순서 56 / 81')
    await expect(pager.getByRole('link')).toHaveCount(2)
    await expect(pager.getByRole('link', { name: /이전 개념/ })).toHaveAttribute(
      'href',
      '/concepts/match-all',
    )
    await expect(pager.getByRole('link', { name: /다음 개념/ })).toHaveAttribute(
      'href',
      '/concepts/set-map',
    )

    await page.goto('/concepts/set-map')
    await waitForHydration(page)
    pager = page.getByRole('navigation', { name: '학습 순서' })
    await expect(pager).toContainText('학습 순서 57 / 81')
    await expect(pager.getByRole('link')).toHaveCount(2)
    await expect(pager.getByRole('link', { name: /이전 개념/ })).toHaveAttribute(
      'href',
      '/concepts/spread-destructuring',
    )
    await expect(pager.getByRole('link', { name: /다음 개념/ })).toHaveAttribute(
      'href',
      '/concepts/script-async-defer',
    )

    await page.goto('/concepts/script-async-defer')
    await waitForHydration(page)
    pager = page.getByRole('navigation', { name: '학습 순서' })
    await expect(pager).toContainText('학습 순서 58 / 81')
    await expect(pager.getByRole('link')).toHaveCount(2)
    await expect(pager.getByRole('link', { name: /이전 개념/ })).toHaveAttribute(
      'href',
      '/concepts/set-map',
    )
    await expect(pager.getByRole('link', { name: /다음 개념/ })).toHaveAttribute(
      'href',
      '/concepts/dom-tree-nodes',
    )

    await page.goto('/concepts/dom-tree-nodes')
    await waitForHydration(page)
    pager = page.getByRole('navigation', { name: '학습 순서' })
    await expect(pager).toContainText('학습 순서 59 / 81')
    await expect(pager.getByRole('link')).toHaveCount(2)
    await expect(pager.getByRole('link', { name: /이전 개념/ })).toHaveAttribute(
      'href',
      '/concepts/script-async-defer',
    )
    await expect(pager.getByRole('link', { name: /다음 개념/ })).toHaveAttribute(
      'href',
      '/concepts/live-html-collection',
    )

    await page.goto('/concepts/live-html-collection')
    await waitForHydration(page)
    pager = page.getByRole('navigation', { name: '학습 순서' })
    await expect(pager).toContainText('학습 순서 60 / 81')
    await expect(pager.getByRole('link')).toHaveCount(2)
    await expect(pager.getByRole('link', { name: /이전 개념/ })).toHaveAttribute(
      'href',
      '/concepts/dom-tree-nodes',
    )
    await expect(pager.getByRole('link', { name: /다음 개념/ })).toHaveAttribute(
      'href',
      '/concepts/html-attribute-dom-property',
    )

    await page.goto('/concepts/html-attribute-dom-property')
    await waitForHydration(page)
    pager = page.getByRole('navigation', { name: '학습 순서' })
    await expect(pager).toContainText('학습 순서 61 / 81')
    await expect(pager.getByRole('link')).toHaveCount(2)
    await expect(pager.getByRole('link', { name: /이전 개념/ })).toHaveAttribute(
      'href',
      '/concepts/live-html-collection',
    )
    await expect(pager.getByRole('link', { name: /다음 개념/ })).toHaveAttribute(
      'href',
      '/concepts/classlist-style',
    )

    await page.goto('/concepts/classlist-style')
    await waitForHydration(page)
    pager = page.getByRole('navigation', { name: '학습 순서' })
    await expect(pager).toContainText('학습 순서 62 / 81')
    await expect(pager.getByRole('link')).toHaveCount(2)
    await expect(pager.getByRole('link', { name: /이전 개념/ })).toHaveAttribute(
      'href',
      '/concepts/html-attribute-dom-property',
    )
    await expect(pager.getByRole('link', { name: /다음 개념/ })).toHaveAttribute(
      'href',
      '/concepts/dom-manipulation',
    )

    await page.goto('/concepts/dom-manipulation')
    await waitForHydration(page)
    pager = page.getByRole('navigation', { name: '학습 순서' })
    await expect(pager).toContainText('학습 순서 63 / 81')
    await expect(pager.getByRole('link')).toHaveCount(2)
    await expect(pager.getByRole('link', { name: /이전 개념/ })).toHaveAttribute(
      'href',
      '/concepts/classlist-style',
    )
    await expect(pager.getByRole('link', { name: /다음 개념/ })).toHaveAttribute(
      'href',
      '/concepts/event-propagation-delegation',
    )

    await page.goto('/concepts/event-propagation-delegation')
    await waitForHydration(page)
    pager = page.getByRole('navigation', { name: '학습 순서' })
    await expect(pager).toContainText('학습 순서 64 / 81')
    await expect(pager.getByRole('link')).toHaveCount(2)
    await expect(pager.getByRole('link', { name: /이전 개념/ })).toHaveAttribute(
      'href',
      '/concepts/dom-manipulation',
    )
    await expect(pager.getByRole('link', { name: /다음 개념/ })).toHaveAttribute(
      'href',
      '/concepts/prevent-default-stop-propagation',
    )

    await page.goto('/concepts/prevent-default-stop-propagation')
    await waitForHydration(page)
    pager = page.getByRole('navigation', { name: '학습 순서' })
    await expect(pager).toContainText('학습 순서 65 / 81')
    await expect(pager.getByRole('link')).toHaveCount(2)
    await expect(pager.getByRole('link', { name: /이전 개념/ })).toHaveAttribute(
      'href',
      '/concepts/event-propagation-delegation',
    )
    await expect(pager.getByRole('link', { name: /다음 개념/ })).toHaveAttribute(
      'href',
      '/concepts/timers',
    )

    await page.goto('/concepts/timers')
    await waitForHydration(page)
    pager = page.getByRole('navigation', { name: '학습 순서' })
    await expect(pager).toContainText('학습 순서 66 / 81')
    await expect(pager.getByRole('link')).toHaveCount(2)
    await expect(pager.getByRole('link', { name: /이전 개념/ })).toHaveAttribute(
      'href',
      '/concepts/prevent-default-stop-propagation',
    )
    await expect(pager.getByRole('link', { name: /다음 개념/ })).toHaveAttribute(
      'href',
      '/concepts/event-loop',
    )

    await page.goto('/concepts/event-loop')
    await waitForHydration(page)
    pager = page.getByRole('navigation', { name: '학습 순서' })
    await expect(pager).toContainText('학습 순서 67 / 81')
    await expect(pager.getByRole('link')).toHaveCount(2)
    await expect(pager.getByRole('link', { name: /이전 개념/ })).toHaveAttribute(
      'href',
      '/concepts/timers',
    )
    await expect(pager.getByRole('link', { name: /다음 개념/ })).toHaveAttribute(
      'href',
      '/concepts/json',
    )

    await page.goto('/concepts/json')
    await waitForHydration(page)
    pager = page.getByRole('navigation', { name: '학습 순서' })
    await expect(pager).toContainText('학습 순서 68 / 81')
    await expect(pager.getByRole('link')).toHaveCount(2)
    await expect(pager.getByRole('link', { name: /이전 개념/ })).toHaveAttribute(
      'href',
      '/concepts/event-loop',
    )
    await expect(pager.getByRole('link', { name: /다음 개념/ })).toHaveAttribute(
      'href',
      '/concepts/structured-clone',
    )

    await page.goto('/concepts/structured-clone')
    await waitForHydration(page)
    pager = page.getByRole('navigation', { name: '학습 순서' })
    await expect(pager).toContainText('학습 순서 69 / 81')
    await expect(pager.getByRole('link')).toHaveCount(2)
    await expect(pager.getByRole('link', { name: /이전 개념/ })).toHaveAttribute(
      'href',
      '/concepts/json',
    )
    await expect(pager.getByRole('link', { name: /다음 개념/ })).toHaveAttribute(
      'href',
      '/concepts/promise',
    )

    await page.goto('/concepts/promise')
    await waitForHydration(page)
    pager = page.getByRole('navigation', { name: '학습 순서' })
    await expect(pager).toContainText('학습 순서 70 / 81')
    await expect(pager.getByRole('link')).toHaveCount(2)
    await expect(pager.getByRole('link', { name: /이전 개념/ })).toHaveAttribute(
      'href',
      '/concepts/structured-clone',
    )
    await expect(pager.getByRole('link', { name: /다음 개념/ })).toHaveAttribute(
      'href',
      '/concepts/microtask-queue',
    )

    await page.goto('/concepts/microtask-queue')
    await waitForHydration(page)
    pager = page.getByRole('navigation', { name: '학습 순서' })
    await expect(pager).toContainText('학습 순서 71 / 81')
    await expect(pager.getByRole('link')).toHaveCount(2)
    await expect(pager.getByRole('link', { name: /이전 개념/ })).toHaveAttribute(
      'href',
      '/concepts/promise',
    )
    await expect(pager.getByRole('link', { name: /다음 개념/ })).toHaveAttribute(
      'href',
      '/concepts/request-animation-frame',
    )

    await page.goto('/concepts/request-animation-frame')
    await waitForHydration(page)
    pager = page.getByRole('navigation', { name: '학습 순서' })
    await expect(pager).toContainText('학습 순서 72 / 81')
    await expect(pager.getByRole('link')).toHaveCount(2)
    await expect(pager.getByRole('link', { name: /이전 개념/ })).toHaveAttribute(
      'href',
      '/concepts/microtask-queue',
    )
    await expect(pager.getByRole('link', { name: /다음 개념/ })).toHaveAttribute(
      'href',
      '/concepts/promise-static-methods',
    )

    await page.goto('/concepts/promise-static-methods')
    await waitForHydration(page)
    pager = page.getByRole('navigation', { name: '학습 순서' })
    await expect(pager).toContainText('학습 순서 73 / 81')
    await expect(pager.getByRole('link')).toHaveCount(2)
    await expect(pager.getByRole('link', { name: /이전 개념/ })).toHaveAttribute(
      'href',
      '/concepts/request-animation-frame',
    )
    await expect(pager.getByRole('link', { name: /다음 개념/ })).toHaveAttribute(
      'href',
      '/concepts/mutation-observer',
    )

    await page.goto(MUTATION_OBSERVER_PATH)
    await waitForHydration(page)
    pager = page.getByRole('navigation', { name: '학습 순서' })
    await expect(pager).toContainText('학습 순서 74 / 81')
    await expect(pager.getByRole('link')).toHaveCount(2)
    await expect(pager.getByRole('link', { name: /이전 개념/ })).toHaveAttribute(
      'href',
      '/concepts/promise-static-methods',
    )
    await expect(pager.getByRole('link', { name: /다음 개념/ })).toHaveAttribute(
      'href',
      '/concepts/fetch',
    )

    await page.goto('/concepts/fetch')
    await waitForHydration(page)
    pager = page.getByRole('navigation', { name: '학습 순서' })
    await expect(pager).toContainText('학습 순서 75 / 81')
    await expect(pager.getByRole('link')).toHaveCount(2)
    await expect(pager.getByRole('link', { name: /이전 개념/ })).toHaveAttribute(
      'href',
      '/concepts/mutation-observer',
    )
    await expect(pager.getByRole('link', { name: /다음 개념/ })).toHaveAttribute(
      'href',
      '/concepts/generator',
    )

    await page.goto('/concepts/generator')
    await waitForHydration(page)
    pager = page.getByRole('navigation', { name: '학습 순서' })
    await expect(pager).toContainText('학습 순서 76 / 81')
    await expect(pager.getByRole('link')).toHaveCount(2)
    await expect(pager.getByRole('link', { name: /이전 개념/ })).toHaveAttribute(
      'href',
      '/concepts/fetch',
    )
    await expect(pager.getByRole('link', { name: /다음 개념/ })).toHaveAttribute(
      'href',
      '/concepts/async-await',
    )

    await page.goto('/concepts/async-await')
    await waitForHydration(page)
    pager = page.getByRole('navigation', { name: '학습 순서' })
    await expect(pager).toContainText('학습 순서 77 / 81')
    await expect(pager.getByRole('link')).toHaveCount(2)
    await expect(pager.getByRole('link', { name: /이전 개념/ })).toHaveAttribute(
      'href',
      '/concepts/generator',
    )
    await expect(pager.getByRole('link', { name: /다음 개념/ })).toHaveAttribute(
      'href',
      '/concepts/error-handling',
    )

    await page.goto('/concepts/error-handling')
    await waitForHydration(page)
    pager = page.getByRole('navigation', { name: '학습 순서' })
    await expect(pager).toContainText('학습 순서 78 / 81')
    await expect(pager.getByRole('link')).toHaveCount(2)
    await expect(pager.getByRole('link', { name: /이전 개념/ })).toHaveAttribute(
      'href',
      '/concepts/async-await',
    )
    await expect(pager.getByRole('link', { name: /다음 개념/ })).toHaveAttribute(
      'href',
      '/concepts/uncaught-exceptions',
    )

    await page.goto(UNCAUGHT_EXCEPTIONS_PATH)
    await waitForHydration(page)
    pager = page.getByRole('navigation', { name: '학습 순서' })
    await expect(pager).toContainText('학습 순서 79 / 81')
    await expect(pager.getByRole('link')).toHaveCount(2)
    await expect(pager.getByRole('link', { name: /이전 개념/ })).toHaveAttribute(
      'href',
      '/concepts/error-handling',
    )
    await expect(pager.getByRole('link', { name: /다음 개념/ })).toHaveAttribute(
      'href',
      '/concepts/async-generator',
    )

    await page.goto('/concepts/async-generator')
    await waitForHydration(page)
    pager = page.getByRole('navigation', { name: '학습 순서' })
    await expect(pager).toContainText('학습 순서 80 / 81')
    await expect(pager.getByRole('link')).toHaveCount(2)
    await expect(pager.getByRole('link', { name: /이전 개념/ })).toHaveAttribute(
      'href',
      '/concepts/uncaught-exceptions',
    )
    await expect(pager.getByRole('link', { name: /다음 개념/ })).toHaveAttribute(
      'href',
      '/concepts/es-modules',
    )

    await page.goto('/concepts/es-modules')
    await waitForHydration(page)
    pager = page.getByRole('navigation', { name: '학습 순서' })
    await expect(pager).toContainText('학습 순서 81 / 81')
    await expect(pager.getByRole('link')).toHaveCount(1)
    await expect(pager.getByRole('link')).toHaveAttribute('href', '/concepts/async-generator')

    await page.goto(FUNCTION_DEFINITIONS_PATH)
    await waitForHydration(page)
    pager = page.getByRole('navigation', { name: '학습 순서' })
    await expect(pager).toContainText('학습 순서 14 / 81')
    await expect(pager.getByRole('link')).toHaveCount(2)
    await expect(pager.getByRole('link', { name: /이전 개념/ })).toHaveAttribute(
      'href',
      '/concepts/property-keys',
    )
    await expect(pager.getByRole('link', { name: /다음 개념/ })).toHaveAttribute(
      'href',
      '/concepts/function-calls',
    )

    await page.goto(AUTOMATIC_SEMICOLON_INSERTION_PATH)
    await waitForHydration(page)
    pager = page.getByRole('navigation', { name: '학습 순서' })
    await expect(pager).toContainText('학습 순서 16 / 81')
    await expect(pager.getByRole('link')).toHaveCount(2)
    await expect(pager.getByRole('link', { name: /이전 개념/ })).toHaveAttribute(
      'href',
      '/concepts/function-calls',
    )
    await expect(pager.getByRole('link', { name: /다음 개념/ })).toHaveAttribute(
      'href',
      '/concepts/hoisting',
    )

    await page.goto(SWITCH_LET_PATH)
    await waitForHydration(page)
    pager = page.getByRole('navigation', { name: '학습 순서' })
    await expect(pager).toContainText('학습 순서 21 / 81')
    await expect(pager.getByRole('link')).toHaveCount(2)
    await expect(pager.getByRole('link', { name: /이전 개념/ })).toHaveAttribute(
      'href',
      '/concepts/tdz',
    )
    await expect(pager.getByRole('link', { name: /다음 개념/ })).toHaveAttribute(
      'href',
      '/concepts/property-attributes',
    )

    await page.goto('/concepts/hoisting')
    await waitForHydration(page)
    pager = page.getByRole('navigation', { name: '학습 순서' })
    await expect(pager.getByRole('link')).toHaveCount(2)
    await expect(pager.getByRole('link', { name: /이전 개념/ })).toHaveAttribute(
      'href',
      '/concepts/automatic-semicolon-insertion',
    )
    await pager.getByRole('link', { name: /다음 개념/ }).click()
    await expect(page).toHaveURL(/\/concepts\/scope-chain$/)
    expect(errors.messages).toEqual([])
  })
})
