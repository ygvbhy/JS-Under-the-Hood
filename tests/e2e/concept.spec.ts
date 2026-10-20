import { expect, test, type Locator, type Page } from '@playwright/test'
import { CONCEPT_PATH, SIMULATOR_NAME, collectConsoleErrors, waitForHydration } from './helpers'

const simulator = (page: Page) => page.getByRole('region', { name: SIMULATOR_NAME })
const liveRegion = (region: Locator) => region.getByRole('status')
const currentLine = (region: Locator) => region.locator('[aria-current="step"]')
const bindingRow = (region: Locator, name: string) =>
  region
    .getByRole('region', { name: '변수' })
    .getByRole('listitem')
    .filter({
      has: region.page().getByText(name, { exact: true }),
    })

async function openConcept(page: Page) {
  const errors = collectConsoleErrors(page)
  await page.goto(CONCEPT_PATH)
  await waitForHydration(page)
  // 퀴즈는 하이드레이션 이후에 라디오 UI로 바뀐다
  await expect(page.getByRole('button', { name: '정답 확인' }).first()).toBeVisible()
  return errors
}

test.describe('개념 상세', () => {
  test('헤더·검토 배지·학습 목표·선행 개념 칩을 보여 준다', async ({ page }) => {
    const errors = await openConcept(page)

    await expect(
      page.getByRole('heading', { level: 1, name: '원시 값과 객체: 재할당과 변경' }),
    ).toBeVisible()
    await expect(page.locator('article > header').getByText('검토 중')).toBeVisible()
    await expect(page.getByRole('heading', { level: 2, name: '학습 목표' })).toBeVisible()

    const prerequisites = page.getByRole('region', { name: '선행 개념' })
    await expect(prerequisites).toBeVisible()
    for (const label of ['변수와 선언', '데이터 타입', '함수 호출']) {
      // 아직 개념 페이지가 없는 선행 개념은 링크가 아니라 텍스트 칩이다
      await expect(prerequisites.getByText(label)).toBeVisible()
      await expect(prerequisites.getByRole('link', { name: label })).toHaveCount(0)
    }
    expect(errors.messages).toEqual([])
  })

  test('예측 퀴즈: 선택 전 확인 불가 → 선택 → 정답·이유 → 다시 풀기', async ({ page }) => {
    const errors = await openConcept(page)

    const quiz = page.getByRole('group', { name: /예제 1의 출력은 무엇일까요/ })
    const box = quiz.locator('..')
    const check = box.getByRole('button', { name: '정답 확인' })
    await expect(check).toBeDisabled()

    await quiz.getByRole('radio').nth(0).check()
    await expect(check).toBeEnabled()
    await check.click()

    await expect(box.getByText('정답입니다.')).toBeVisible()
    await expect(box.getByText('✓ 정답')).toBeVisible()
    await expect(box.getByText(/b와 q는 재할당되었을 뿐이므로/)).toBeVisible()

    await box.getByRole('button', { name: '다시 풀기' }).click()
    await expect(box.getByText('정답입니다.')).toHaveCount(0)
    await expect(box.getByRole('button', { name: '정답 확인' })).toBeDisabled()
    await expect(quiz.getByRole('radio', { checked: true })).toHaveCount(0)

    // 오답을 고르면 정답 번호와 오답 표시를 함께 보여 준다
    await quiz.getByRole('radio').nth(1).check()
    await box.getByRole('button', { name: '정답 확인' }).click()
    await expect(box.getByText('오답입니다. 정답은 1번입니다.')).toBeVisible()
    await expect(box.getByText('✗ 선택한 답 (오답)')).toBeVisible()
    expect(errors.messages).toEqual([])
  })

  test('시뮬레이터 "변경": 다음을 누를 때마다 강조 줄이 1→2→3→4로 이동한다', async ({ page }) => {
    const errors = await openConcept(page)
    const region = simulator(page)
    await region.getByRole('radio', { name: '변경' }).check()

    await expect(region.getByText('단계 1 / 5')).toBeVisible()
    await expect(currentLine(region)).toHaveCount(0)

    const next = region.getByRole('button', { name: '다음' })
    const lines = ['const p = { n: 1 }', 'const q = p', 'q.n = 2', 'console.log(p.n, p === q)']
    for (const [i, text] of lines.entries()) {
      await next.click()
      await expect(currentLine(region)).toHaveCount(1)
      await expect(currentLine(region)).toContainText(String(i + 1))
      await expect(currentLine(region)).toContainText(text)

      if (text === 'q.n = 2') {
        const objectA = region.locator('[data-object-id="A"]')
        await expect(objectA).toContainText(/n:\s*2/)
        await expect(objectA).toContainText('변경됨')
      }
    }

    await expect(region.getByText('단계 5 / 5')).toBeVisible()
    await expect(next).toHaveAttribute('aria-disabled', 'true')
    await expect(next).toBeFocused()
    await expect(region.getByRole('list').filter({ hasText: '2 true' })).toBeVisible()

    await region.getByRole('button', { name: '처음으로' }).click()
    await expect(region.getByText('단계 1 / 5')).toBeVisible()
    await expect(liveRegion(region)).toContainText('단계 1:')
    await expect(currentLine(region)).toHaveCount(0)
    expect(errors.messages).toEqual([])
  })

  test('시뮬레이터 "재할당": q 재할당 뒤 p는 객체 A, q는 객체 B를 가리킨다', async ({ page }) => {
    const errors = await openConcept(page)
    const region = simulator(page)
    await expect(region.getByRole('radio', { name: '재할당' })).toBeChecked()

    const next = region.getByRole('button', { name: '다음' })
    // 단계 1(실행 전) → 단계 7(q = { n: 2 })
    for (let i = 0; i < 6; i++) await next.click()
    await expect(region.getByText('단계 7 / 8')).toBeVisible()
    await expect(currentLine(region)).toContainText('q = { n: 2 }')
    await expect(bindingRow(region, 'p')).toContainText('→ 객체 A')
    await expect(bindingRow(region, 'q')).toContainText('→ 객체 B')

    await next.click()
    await expect(region.getByText('단계 8 / 8')).toBeVisible()
    await expect(region.getByRole('list').filter({ hasText: '10 20 1 2' })).toBeVisible()
    await expect(bindingRow(region, 'p')).toContainText('→ 객체 A')
    await expect(bindingRow(region, 'q')).toContainText('→ 객체 B')
    expect(errors.messages).toEqual([])
  })

  test('키보드: 영역에 포커스 후 ←/→/Home으로 이동하고 live region이 갱신된다', async ({
    page,
  }) => {
    const errors = await openConcept(page)
    const region = simulator(page)
    const live = liveRegion(region)

    // 키보드만으로 도달: 바로 앞 제목의 앵커 링크에서 Tab 한 번으로 시뮬레이터 영역에 포커스가 간다
    await page.getByRole('heading', { name: '시뮬레이터로 확인하기' }).getByRole('link').focus()
    await page.keyboard.press('Tab')
    await expect(region).toBeFocused()

    // 안내(sr-only status)는 처음에는 비어 있고, 사용자 조작 뒤부터 현재 단계를 담는다
    await expect(live).toHaveText('')
    await expect(live).toHaveAttribute('aria-live', 'polite')
    await page.keyboard.press('ArrowRight')
    await expect(live).toContainText('단계 2:')
    await expect(region.getByText('단계 2 / 8')).toBeVisible()
    await page.keyboard.press('ArrowRight')
    await expect(live).toContainText('단계 3:')
    await page.keyboard.press('ArrowLeft')
    await expect(live).toContainText('단계 2:')
    await page.keyboard.press('Home')
    await expect(live).toContainText('단계 1:')

    // 단계 컨트롤 버튼에 포커스가 있어도 같은 키가 동작한다
    await region.getByRole('button', { name: '다음' }).focus()
    await page.keyboard.press('ArrowRight')
    await expect(live).toContainText('단계 2:')

    // 자동 재생 중에는 안내가 고정되고, 멈추면 현재 단계가 안내된다
    await region.getByRole('button', { name: '자동 재생' }).click()
    await expect(region.getByText(/단계 [4-8] \/ 8/)).toBeVisible() // 재생이 진행된다
    await expect(live).toContainText('단계 2:')
    await region.getByRole('button', { name: '일시정지' }).click()
    const current = await region.getByText(/^단계 \d \/ 8$/).textContent()
    const n = current!.match(/단계 (\d)/)![1]
    await expect(live).toContainText(`단계 ${n}:`)
    expect(errors.messages).toEqual([])
  })

  test('시뮬레이터 컨트롤은 모바일 뷰포트에서도 조작할 수 있다', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', '모바일 프로젝트 전용')
    const errors = await openConcept(page)
    const region = simulator(page)
    await region.getByRole('button', { name: '다음' }).tap()
    await expect(region.getByText('단계 2 / 8')).toBeVisible()
    await region.getByRole('button', { name: '처음으로' }).tap()
    await expect(region.getByText('단계 1 / 8')).toBeVisible()
    expect(errors.messages).toEqual([])
  })
})
