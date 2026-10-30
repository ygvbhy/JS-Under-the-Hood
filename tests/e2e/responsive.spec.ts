import { expect, test } from '@playwright/test'
import {
  CONCEPT_PATH,
  EQUALITY_PATH,
  EQUALITY_SIMULATOR_NAME,
  INCREMENT_PATH,
  INCREMENT_SIMULATOR_NAME,
  NUMBER_TYPE_PATH,
  SHORT_CIRCUIT_PATH,
  SHORT_CIRCUIT_SIMULATOR_NAME,
  FUNCTION_CALLS_PATH,
  FUNCTION_CALLS_SIMULATOR_NAME,
  HOISTING_PATH,
  HOISTING_SIMULATOR_NAME,
  PROPERTY_KEYS_PATH,
  PROPERTY_KEYS_SIMULATOR_NAME,
  SCOPE_CHAIN_PATH,
  SCOPE_CHAIN_SIMULATOR_NAME,
  BLOCK_SCOPE_PATH,
  BLOCK_SCOPE_SIMULATOR_NAME,
  TDZ_PATH,
  TDZ_SIMULATOR_NAME,
  PROPERTY_ATTRIBUTES_PATH,
  PROPERTY_ATTRIBUTES_SIMULATOR_NAME,
  NEW_OPERATOR_PATH,
  NEW_OPERATOR_SIMULATOR_NAME,
  PROTOTYPE_CHAIN_PATH,
  PROTOTYPE_CHAIN_SIMULATOR_NAME,
  PRIMITIVE_METHODS_PATH,
  THIS_BINDING_PATH,
  THIS_BINDING_SIMULATOR_NAME,
  EXECUTION_CONTEXT_PATH,
  EXECUTION_CONTEXT_SIMULATOR_NAME,
  CLOSURE_PATH,
  CLOSURE_SIMULATOR_NAME,
  SWITCH_PATH,
  SWITCH_SIMULATOR_NAME,
  TYPE_COERCION_PATH,
  TYPE_COERCION_SIMULATOR_NAME,
  TYPEOF_PATH,
  waitForHydration,
} from './helpers'

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

test(`${SHORT_CIRCUIT_PATH}: 가로 스크롤이 없다`, async ({ page }) => {
  await page.goto(SHORT_CIRCUIT_PATH)
  await waitForHydration(page)
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }))
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth)
})

test('단축 평가 개념 페이지: 시뮬레이터를 끝까지 진행해도 가로 스크롤이 없다', async ({ page }) => {
  await page.goto(SHORT_CIRCUIT_PATH)
  await waitForHydration(page)
  const region = page.getByRole('region', { name: SHORT_CIRCUIT_SIMULATOR_NAME })
  for (const scenario of ['값을 돌려줌', '오른쪽 건너뛰기', '?? 와 ||', '?. 체인']) {
    await region.getByRole('radio', { name: scenario, exact: true }).check()
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

test(`${TYPE_COERCION_PATH}: 가로 스크롤이 없다`, async ({ page }) => {
  await page.goto(TYPE_COERCION_PATH)
  await waitForHydration(page)
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }))
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth)
})

test('암묵적 타입 변환 개념 페이지: 시뮬레이터를 끝까지 진행해도 가로 스크롤이 없다', async ({
  page,
}) => {
  await page.goto(TYPE_COERCION_PATH)
  await waitForHydration(page)
  const region = page.getByRole('region', { name: TYPE_COERCION_SIMULATOR_NAME })
  for (const scenario of ['+ 의 순서', '- 와 + 섞기', '> 비교']) {
    await region.getByRole('radio', { name: scenario, exact: true }).check()
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

test(`${EQUALITY_PATH}: 가로 스크롤이 없다`, async ({ page }) => {
  await page.goto(EQUALITY_PATH)
  await waitForHydration(page)
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }))
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth)
})

test(`${NUMBER_TYPE_PATH}: 가로 스크롤이 없다`, async ({ page }) => {
  await page.goto(NUMBER_TYPE_PATH)
  await waitForHydration(page)
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }))
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth)
})

test(`${TYPEOF_PATH}: 가로 스크롤이 없다`, async ({ page }) => {
  await page.goto(TYPEOF_PATH)
  await waitForHydration(page)
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }))
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth)
})

test('동등 비교 개념 페이지: 시뮬레이터를 끝까지 진행해도 가로 스크롤이 없다', async ({ page }) => {
  await page.goto(EQUALITY_PATH)
  await waitForHydration(page)
  const region = page.getByRole('region', { name: EQUALITY_SIMULATOR_NAME })
  for (const scenario of ['숫자와 문자열', '불리언과 비교', 'null과 undefined']) {
    await region.getByRole('radio', { name: scenario, exact: true }).check()
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

test(`${INCREMENT_PATH}: 가로 스크롤이 없다`, async ({ page }) => {
  await page.goto(INCREMENT_PATH)
  await waitForHydration(page)
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }))
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth)
})

test('증감 연산자 개념 페이지: 시뮬레이터를 끝까지 진행해도 가로 스크롤이 없다', async ({
  page,
}) => {
  await page.goto(INCREMENT_PATH)
  await waitForHydration(page)
  const region = page.getByRole('region', { name: INCREMENT_SIMULATOR_NAME })
  for (const scenario of ['후위와 전위', '자기 자신에 대입', '피연산자 평가 순서']) {
    await region.getByRole('radio', { name: scenario, exact: true }).check()
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

test(`${SWITCH_PATH}: 가로 스크롤이 없다`, async ({ page }) => {
  await page.goto(SWITCH_PATH)
  await waitForHydration(page)
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }))
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth)
})

test('switch와 break·continue 개념 페이지: 시뮬레이터를 끝까지 진행해도 가로 스크롤이 없다', async ({
  page,
}) => {
  await page.goto(SWITCH_PATH)
  await waitForHydration(page)
  const region = page.getByRole('region', { name: SWITCH_SIMULATOR_NAME })
  for (const scenario of ['break가 없을 때', '반복문의 break와 continue', '반복문 안의 switch']) {
    await region.getByRole('radio', { name: scenario, exact: true }).check()
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

test(`${PROPERTY_KEYS_PATH}: 가로 스크롤이 없다`, async ({ page }) => {
  await page.goto(PROPERTY_KEYS_PATH)
  await waitForHydration(page)
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }))
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth)
})

test('프로퍼티 키 개념 페이지: 시뮬레이터를 끝까지 진행해도 가로 스크롤이 없다', async ({
  page,
}) => {
  await page.goto(PROPERTY_KEYS_PATH)
  await waitForHydration(page)
  const region = page.getByRole('region', { name: PROPERTY_KEYS_SIMULATOR_NAME })
  for (const scenario of ['숫자 키와 문자열 키', '점 표기와 대괄호 표기', '추가·갱신·삭제']) {
    await region.getByRole('radio', { name: scenario, exact: true }).check()
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

test(`${FUNCTION_CALLS_PATH}: 가로 스크롤이 없다`, async ({ page }) => {
  await page.goto(FUNCTION_CALLS_PATH)
  await waitForHydration(page)
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }))
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth)
})

test('함수 호출 개념 페이지: 시뮬레이터를 끝까지 진행해도 가로 스크롤이 없다', async ({ page }) => {
  await page.goto(FUNCTION_CALLS_PATH)
  await waitForHydration(page)
  const region = page.getByRole('region', { name: FUNCTION_CALLS_SIMULATOR_NAME })
  for (const scenario of ['인수 개수가 다를 때', 'return이 없을 때', '인수 평가 순서']) {
    await region.getByRole('radio', { name: scenario, exact: true }).check()
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

test(`${HOISTING_PATH}: 가로 스크롤이 없다`, async ({ page }) => {
  await page.goto(HOISTING_PATH)
  await waitForHydration(page)
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }))
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth)
})

test('호이스팅 개념 페이지: 시뮬레이터를 끝까지 진행해도 가로 스크롤이 없다', async ({ page }) => {
  await page.goto(HOISTING_PATH)
  await waitForHydration(page)
  const region = page.getByRole('region', { name: HOISTING_SIMULATOR_NAME })
  for (const scenario of [
    'var 선언 전 참조',
    '함수 선언과 함수 표현식',
    '같은 이름의 var와 함수',
  ]) {
    await region.getByRole('radio', { name: scenario, exact: true }).check()
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

test(`${SCOPE_CHAIN_PATH}: 가로 스크롤이 없다`, async ({ page }) => {
  await page.goto(SCOPE_CHAIN_PATH)
  await waitForHydration(page)
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }))
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth)
})

test('스코프 체인 개념 페이지: 시뮬레이터를 끝까지 진행해도 가로 스크롤이 없다', async ({
  page,
}) => {
  await page.goto(SCOPE_CHAIN_PATH)
  await waitForHydration(page)
  const region = page.getByRole('region', { name: SCOPE_CHAIN_SIMULATOR_NAME })
  for (const scenario of ['스코프 체인', '렉시컬 스코프', '가려진 이름과 선언 처리']) {
    await region.getByRole('radio', { name: scenario, exact: true }).check()
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

test(`${BLOCK_SCOPE_PATH}: 가로 스크롤이 없다`, async ({ page }) => {
  await page.goto(BLOCK_SCOPE_PATH)
  await waitForHydration(page)
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }))
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth)
})

test('블록 스코프 개념 페이지: 시뮬레이터를 끝까지 진행해도 가로 스크롤이 없다', async ({
  page,
}) => {
  await page.goto(BLOCK_SCOPE_PATH)
  await waitForHydration(page)
  const region = page.getByRole('region', { name: BLOCK_SCOPE_SIMULATOR_NAME })
  for (const scenario of ['블록 안의 var와 let', '함수 안의 블록', '암묵적 전역']) {
    await region.getByRole('radio', { name: scenario, exact: true }).check()
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

test(`${TDZ_PATH}: 가로 스크롤이 없다`, async ({ page }) => {
  await page.goto(TDZ_PATH)
  await waitForHydration(page)
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }))
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth)
})

test('TDZ 개념 페이지: 시뮬레이터를 끝까지 진행해도 가로 스크롤이 없다', async ({ page }) => {
  await page.goto(TDZ_PATH)
  await waitForHydration(page)
  const region = page.getByRole('region', { name: TDZ_SIMULATOR_NAME })
  for (const scenario of ['선언 전에 읽기', '안쪽 블록의 가림', '시점이 정한다']) {
    await region.getByRole('radio', { name: scenario, exact: true }).check()
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

test(`${PROPERTY_ATTRIBUTES_PATH}: 가로 스크롤이 없다`, async ({ page }) => {
  await page.goto(PROPERTY_ATTRIBUTES_PATH)
  await waitForHydration(page)
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }))
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth)
})

test('프로퍼티 어트리뷰트 개념 페이지: 시뮬레이터를 끝까지 진행해도 가로 스크롤이 없다', async ({
  page,
}) => {
  await page.goto(PROPERTY_ATTRIBUTES_PATH)
  await waitForHydration(page)
  const region = page.getByRole('region', { name: PROPERTY_ATTRIBUTES_SIMULATOR_NAME })
  for (const scenario of [
    '쓰기 금지: sloppy mode',
    '쓰기 금지: strict mode',
    'getter는 읽을 때 호출된다',
    'freeze는 얕다',
  ]) {
    await region.getByRole('radio', { name: scenario, exact: true }).check()
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

test(`${NEW_OPERATOR_PATH}: 가로 스크롤이 없다`, async ({ page }) => {
  await page.goto(NEW_OPERATOR_PATH)
  await waitForHydration(page)
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }))
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth)
})

test('new 연산자 개념 페이지: 시뮬레이터를 끝까지 진행해도 가로 스크롤이 없다', async ({
  page,
}) => {
  await page.goto(NEW_OPERATOR_PATH)
  await waitForHydration(page)
  const region = page.getByRole('region', { name: NEW_OPERATOR_SIMULATOR_NAME })
  for (const scenario of [
    '객체 두 개 만들기',
    '객체를 return하면',
    '원시 값을 return하면',
    'new 없이 호출하면',
  ]) {
    await region.getByRole('radio', { name: scenario, exact: true }).check()
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

test(`${PROTOTYPE_CHAIN_PATH}: 가로 스크롤이 없다`, async ({ page }) => {
  await page.goto(PROTOTYPE_CHAIN_PATH)
  await waitForHydration(page)
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }))
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth)
})

test('프로토타입 체인 개념 페이지: 시뮬레이터를 끝까지 진행해도 가로 스크롤이 없다', async ({
  page,
}) => {
  await page.goto(PROTOTYPE_CHAIN_PATH)
  await waitForHydration(page)
  const region = page.getByRole('region', { name: PROTOTYPE_CHAIN_SIMULATOR_NAME })
  for (const scenario of [
    '프로토타입 체인',
    'prototype 프로퍼티와 [[Prototype]]',
    '대입과 섀도잉',
    'instanceof',
  ]) {
    await region.getByRole('radio', { name: scenario, exact: true }).check()
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

test(`${THIS_BINDING_PATH}: 가로 스크롤이 없다`, async ({ page }) => {
  await page.goto(THIS_BINDING_PATH)
  await waitForHydration(page)
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }))
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth)
})

test('this 개념 페이지: 시뮬레이터를 끝까지 진행해도 가로 스크롤이 없다', async ({ page }) => {
  await page.goto(THIS_BINDING_PATH)
  await waitForHydration(page)
  const region = page.getByRole('region', { name: THIS_BINDING_SIMULATOR_NAME })
  for (const scenario of [
    '메서드를 꺼내 호출하면',
    '콜백으로 넘기면',
    'bind한 함수를 다시 부르면',
    '괄호와 쉼표',
  ]) {
    await region.getByRole('radio', { name: scenario, exact: true }).check()
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

test(`${EXECUTION_CONTEXT_PATH}: 가로 스크롤이 없다`, async ({ page }) => {
  await page.goto(EXECUTION_CONTEXT_PATH)
  await waitForHydration(page)
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }))
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth)
})

test('실행 컨텍스트 개념 페이지: 시뮬레이터를 끝까지 진행해도 가로 스크롤이 없다', async ({
  page,
}) => {
  await page.goto(EXECUTION_CONTEXT_PATH)
  await waitForHydration(page)
  const region = page.getByRole('region', { name: EXECUTION_CONTEXT_SIMULATOR_NAME })
  for (const scenario of [
    '호출 스택',
    '이름 찾기와 정의한 곳',
    '블록의 환경 교체와 복원',
    'this 바인딩의 위치',
  ]) {
    await region.getByRole('radio', { name: scenario, exact: true }).check()
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

test(`${CLOSURE_PATH}: 가로 스크롤이 없다`, async ({ page }) => {
  await page.goto(CLOSURE_PATH)
  await waitForHydration(page)
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }))
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth)
})

test('클로저 개념 페이지: 시뮬레이터를 끝까지 진행해도 가로 스크롤이 없다', async ({ page }) => {
  await page.goto(CLOSURE_PATH)
  await waitForHydration(page)
  const region = page.getByRole('region', { name: CLOSURE_SIMULATOR_NAME })
  for (const scenario of [
    '바깥 함수가 끝난 뒤에도 남는 환경',
    '호출마다 새 환경',
    '같은 호출의 함수들은 환경을 공유',
    '값이 아니라 바인딩',
  ]) {
    await region.getByRole('radio', { name: scenario, exact: true }).check()
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

test(`${PRIMITIVE_METHODS_PATH}: 가로 스크롤이 없다`, async ({ page }) => {
  await page.goto(PRIMITIVE_METHODS_PATH)
  await waitForHydration(page)
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }))
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth)
})

// 문서 전체(scrollWidth)를 보므로 개념 페이지 하단의 학습 순서 이전/다음 영역도 함께 검사된다.
// 제목이 긴 개념(closure, hoisting)에서 하단 내비게이션이 보이는 상태로 확인한다.
for (const path of [CLOSURE_PATH, HOISTING_PATH]) {
  test(`${path}: 하단 학습 순서 내비게이션이 있어도 가로 스크롤이 없다`, async ({ page }) => {
    await page.goto(path)
    await waitForHydration(page)
    const pager = page.getByRole('navigation', { name: '학습 순서' })
    await pager.scrollIntoViewIfNeeded()
    await expect(pager).toBeVisible()
    const { scrollWidth, innerWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }))
    expect(scrollWidth).toBeLessThanOrEqual(innerWidth)
  })
}

test('홈 학습 순서 보기: 가로 스크롤이 없다', async ({ page }) => {
  await page.goto('/?view=order')
  await waitForHydration(page)
  await expect(page.getByRole('article')).toHaveCount(21)
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }))
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth)
})
