import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import {
  CONCEPT_PATH,
  EQUALITY_PATH,
  EQUALITY_SIMULATOR_NAME,
  INCREMENT_PATH,
  INCREMENT_SIMULATOR_NAME,
  NUMBER_TYPE_PATH,
  SHORT_CIRCUIT_PATH,
  SHORT_CIRCUIT_SIMULATOR_NAME,
  SIMULATOR_NAME,
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
  SWITCH_PATH,
  SWITCH_SIMULATOR_NAME,
  TYPE_COERCION_PATH,
  TYPE_COERCION_SIMULATOR_NAME,
  TYPEOF_PATH,
  waitForHydration,
} from './helpers'

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

    test('개념 페이지: 단축 평가', async ({ page }) => {
      await page.goto(SHORT_CIRCUIT_PATH)
      await waitForHydration(page)
      await expect(page.getByRole('button', { name: '정답 확인' }).first()).toBeVisible()
      await expectNoSeriousViolations(page)
    })

    test('개념 페이지: 단축 평가 시뮬레이터를 진행한 뒤', async ({ page }) => {
      test.slow() // 4개 시나리오의 모든 단계에서 axe를 돌리므로 기본 30초에 가깝다
      await page.goto(SHORT_CIRCUIT_PATH)
      await waitForHydration(page)
      const region = page.getByRole('region', { name: SHORT_CIRCUIT_SIMULATOR_NAME })
      for (const scenario of ['값을 돌려줌', '오른쪽 건너뛰기', '?? 와 ||', '?. 체인']) {
        await region.getByRole('radio', { name: scenario, exact: true }).check()
        const next = region.getByRole('button', { name: '다음' })
        // 평가 안 함·결과·새로 생김 표시는 홀수 단계에 몰려 있지 않으므로(시나리오마다 짝수 단계에도 있다)
        // 마지막 단계까지 모든 단계를 검사한다. 시나리오의 단계 수는 모두 12 이하다.
        for (let i = 0; i < 12 && (await next.isEnabled()); i++) {
          await next.click()
          await expectNoSeriousViolations(page)
        }
        await expect(next).toBeDisabled()
      }
    })

    test('개념 페이지: 암묵적 타입 변환', async ({ page }) => {
      await page.goto(TYPE_COERCION_PATH)
      await waitForHydration(page)
      await expect(page.getByRole('button', { name: '정답 확인' }).first()).toBeVisible()
      await expectNoSeriousViolations(page)
    })

    test('개념 페이지: 암묵적 타입 변환 시뮬레이터를 진행한 뒤', async ({ page }) => {
      test.slow() // 3개 시나리오의 모든 단계에서 axe를 돌리므로 기본 30초에 가깝다
      await page.goto(TYPE_COERCION_PATH)
      await waitForHydration(page)
      const region = page.getByRole('region', { name: TYPE_COERCION_SIMULATOR_NAME })
      for (const scenario of ['+ 의 순서', '- 와 + 섞기', '> 비교']) {
        await region.getByRole('radio', { name: scenario, exact: true }).check()
        const next = region.getByRole('button', { name: '다음' })
        // 시나리오의 단계 수는 모두 10 이하이므로 마지막 단계까지 모든 단계를 검사한다.
        for (let i = 0; i < 12 && (await next.isEnabled()); i++) {
          await next.click()
          await expectNoSeriousViolations(page)
        }
        await expect(next).toBeDisabled()
      }
    })

    test('개념 페이지: 동등 비교', async ({ page }) => {
      await page.goto(EQUALITY_PATH)
      await waitForHydration(page)
      await expect(page.getByRole('button', { name: '정답 확인' }).first()).toBeVisible()
      await expectNoSeriousViolations(page)
    })

    test('개념 페이지: 숫자 타입', async ({ page }) => {
      await page.goto(NUMBER_TYPE_PATH)
      await waitForHydration(page)
      await expect(page.getByRole('button', { name: '정답 확인' }).first()).toBeVisible()
      await expectNoSeriousViolations(page)
    })

    test('개념 페이지: typeof 연산자', async ({ page }) => {
      await page.goto(TYPEOF_PATH)
      await waitForHydration(page)
      await expect(page.getByRole('button', { name: '정답 확인' }).first()).toBeVisible()
      await expectNoSeriousViolations(page)
    })

    test('개념 페이지: 증감 연산자', async ({ page }) => {
      await page.goto(INCREMENT_PATH)
      await waitForHydration(page)
      await expect(page.getByRole('button', { name: '정답 확인' }).first()).toBeVisible()
      await expectNoSeriousViolations(page)
    })

    test('개념 페이지: 증감 연산자 시뮬레이터를 진행한 뒤', async ({ page }) => {
      test.slow() // 3개 시나리오의 모든 단계에서 axe를 돌리므로 기본 30초에 가깝다
      await page.goto(INCREMENT_PATH)
      await waitForHydration(page)
      const region = page.getByRole('region', { name: INCREMENT_SIMULATOR_NAME })
      for (const scenario of ['후위와 전위', '자기 자신에 대입', '피연산자 평가 순서']) {
        await region.getByRole('radio', { name: scenario, exact: true }).check()
        const next = region.getByRole('button', { name: '다음' })
        // 시나리오의 단계 수는 모두 10 이하이므로 마지막 단계까지 모든 단계를 검사한다.
        for (let i = 0; i < 12 && (await next.isEnabled()); i++) {
          await next.click()
          await expectNoSeriousViolations(page)
        }
        await expect(next).toBeDisabled()
      }
    })

    test('개념 페이지: switch와 break·continue', async ({ page }) => {
      await page.goto(SWITCH_PATH)
      await waitForHydration(page)
      await expect(page.getByRole('button', { name: '정답 확인' }).first()).toBeVisible()
      await expectNoSeriousViolations(page)
    })

    test('개념 페이지: switch와 break·continue 시뮬레이터를 진행한 뒤', async ({ page }) => {
      test.slow() // 3개 시나리오(9/17/21단계)의 모든 단계에서 axe를 돌린다
      await page.goto(SWITCH_PATH)
      await waitForHydration(page)
      const region = page.getByRole('region', { name: SWITCH_SIMULATOR_NAME })
      for (const scenario of [
        'break가 없을 때',
        '반복문의 break와 continue',
        '반복문 안의 switch',
      ]) {
        await region.getByRole('radio', { name: scenario, exact: true }).check()
        const next = region.getByRole('button', { name: '다음' })
        // 시나리오의 단계 수는 모두 21 이하이므로 마지막 단계까지 모든 단계를 검사한다.
        for (let i = 0; i < 25 && (await next.isEnabled()); i++) {
          await next.click()
          await expectNoSeriousViolations(page)
        }
        await expect(next).toBeDisabled()
      }
    })

    test('개념 페이지: 프로퍼티 키', async ({ page }) => {
      await page.goto(PROPERTY_KEYS_PATH)
      await waitForHydration(page)
      await expect(page.getByRole('button', { name: '정답 확인' }).first()).toBeVisible()
      await expectNoSeriousViolations(page)
    })

    test('개념 페이지: 프로퍼티 키 시뮬레이터를 진행한 뒤', async ({ page }) => {
      test.slow() // 3개 시나리오(9/7/10단계)의 모든 단계에서 axe를 돌린다
      await page.goto(PROPERTY_KEYS_PATH)
      await waitForHydration(page)
      const region = page.getByRole('region', { name: PROPERTY_KEYS_SIMULATOR_NAME })
      for (const scenario of ['숫자 키와 문자열 키', '점 표기와 대괄호 표기', '추가·갱신·삭제']) {
        await region.getByRole('radio', { name: scenario, exact: true }).check()
        const next = region.getByRole('button', { name: '다음' })
        // 시나리오의 단계 수는 모두 10 이하이므로 마지막 단계까지 모든 단계를 검사한다.
        for (let i = 0; i < 12 && (await next.isEnabled()); i++) {
          await next.click()
          await expectNoSeriousViolations(page)
        }
        await expect(next).toBeDisabled()
      }
    })

    test('개념 페이지: 함수 호출', async ({ page }) => {
      await page.goto(FUNCTION_CALLS_PATH)
      await waitForHydration(page)
      await expect(page.getByRole('button', { name: '정답 확인' }).first()).toBeVisible()
      await expectNoSeriousViolations(page)
    })

    test('개념 페이지: 함수 호출 시뮬레이터를 진행한 뒤', async ({ page }) => {
      test.slow() // 3개 시나리오(10/15/12단계)의 모든 단계에서 axe를 돌린다
      await page.goto(FUNCTION_CALLS_PATH)
      await waitForHydration(page)
      const region = page.getByRole('region', { name: FUNCTION_CALLS_SIMULATOR_NAME })
      for (const scenario of ['인수 개수가 다를 때', 'return이 없을 때', '인수 평가 순서']) {
        await region.getByRole('radio', { name: scenario, exact: true }).check()
        const next = region.getByRole('button', { name: '다음' })
        // 시나리오의 단계 수는 모두 15 이하이므로 마지막 단계까지 모든 단계를 검사한다.
        for (let i = 0; i < 18 && (await next.isEnabled()); i++) {
          await next.click()
          await expectNoSeriousViolations(page)
        }
        await expect(next).toBeDisabled()
      }
    })

    test('개념 페이지: 호이스팅', async ({ page }) => {
      await page.goto(HOISTING_PATH)
      await waitForHydration(page)
      await expect(page.getByRole('button', { name: '정답 확인' }).first()).toBeVisible()
      await expectNoSeriousViolations(page)
    })

    test('개념 페이지: 호이스팅 시뮬레이터를 진행한 뒤', async ({ page }) => {
      test.slow() // 3개 시나리오(5/8/6단계)의 모든 단계에서 axe를 돌린다
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
        // 시나리오의 단계 수는 모두 8 이하이므로 마지막 단계까지 모든 단계를 검사한다.
        for (let i = 0; i < 10 && (await next.isEnabled()); i++) {
          await next.click()
          await expectNoSeriousViolations(page)
        }
        await expect(next).toBeDisabled()
      }
    })

    test('개념 페이지: 스코프 체인', async ({ page }) => {
      await page.goto(SCOPE_CHAIN_PATH)
      await waitForHydration(page)
      await expect(page.getByRole('button', { name: '정답 확인' }).first()).toBeVisible()
      await expectNoSeriousViolations(page)
    })

    test('개념 페이지: 스코프 체인 시뮬레이터를 진행한 뒤', async ({ page }) => {
      test.slow() // 3개 시나리오(15/11/10단계)의 모든 단계에서 axe를 돌린다
      await page.goto(SCOPE_CHAIN_PATH)
      await waitForHydration(page)
      const region = page.getByRole('region', { name: SCOPE_CHAIN_SIMULATOR_NAME })
      for (const scenario of ['스코프 체인', '렉시컬 스코프', '가려진 이름과 선언 처리']) {
        await region.getByRole('radio', { name: scenario, exact: true }).check()
        const next = region.getByRole('button', { name: '다음' })
        // 시나리오의 단계 수는 모두 15 이하이므로 마지막 단계까지 모든 단계를 검사한다.
        for (let i = 0; i < 20 && (await next.isEnabled()); i++) {
          await next.click()
          await expectNoSeriousViolations(page)
        }
        await expect(next).toBeDisabled()
      }
    })

    test('개념 페이지: 블록 스코프', async ({ page }) => {
      await page.goto(BLOCK_SCOPE_PATH)
      await waitForHydration(page)
      await expect(page.getByRole('button', { name: '정답 확인' }).first()).toBeVisible()
      await expectNoSeriousViolations(page)
    })

    test('개념 페이지: 블록 스코프 시뮬레이터를 진행한 뒤', async ({ page }) => {
      test.slow() // 3개 시나리오(10/10/8단계)의 모든 단계에서 axe를 돌린다
      await page.goto(BLOCK_SCOPE_PATH)
      await waitForHydration(page)
      const region = page.getByRole('region', { name: BLOCK_SCOPE_SIMULATOR_NAME })
      for (const scenario of ['블록 안의 var와 let', '함수 안의 블록', '암묵적 전역']) {
        await region.getByRole('radio', { name: scenario, exact: true }).check()
        const next = region.getByRole('button', { name: '다음' })
        // 시나리오의 단계 수는 모두 10 이하이므로 마지막 단계까지 모든 단계를 검사한다.
        for (let i = 0; i < 20 && (await next.isEnabled()); i++) {
          await next.click()
          await expectNoSeriousViolations(page)
        }
        await expect(next).toBeDisabled()
      }
    })

    test('개념 페이지: TDZ', async ({ page }) => {
      await page.goto(TDZ_PATH)
      await waitForHydration(page)
      await expect(page.getByRole('button', { name: '정답 확인' }).first()).toBeVisible()
      await expectNoSeriousViolations(page)
    })

    test('개념 페이지: TDZ 시뮬레이터를 진행한 뒤', async ({ page }) => {
      test.slow() // 3개 시나리오의 모든 단계에서 axe를 돌린다
      await page.goto(TDZ_PATH)
      await waitForHydration(page)
      const region = page.getByRole('region', { name: TDZ_SIMULATOR_NAME })
      for (const scenario of ['선언 전에 읽기', '안쪽 블록의 가림', '시점이 정한다']) {
        await region.getByRole('radio', { name: scenario, exact: true }).check()
        const next = region.getByRole('button', { name: '다음' })
        // 시나리오의 단계 수는 모두 20 이하이므로 마지막 단계까지 모든 단계를 검사한다.
        for (let i = 0; i < 20 && (await next.isEnabled()); i++) {
          await next.click()
          await expectNoSeriousViolations(page)
        }
        await expect(next).toBeDisabled()
      }
    })

    test('개념 페이지: TDZ 시뮬레이터 3단계에서 초기화 전 이름 찾기 결과를 보인다', async ({
      page,
    }) => {
      await page.goto(TDZ_PATH)
      await waitForHydration(page)
      const region = page.getByRole('region', { name: TDZ_SIMULATOR_NAME })
      await region.getByRole('radio', { name: '선언 전에 읽기', exact: true }).check()
      const next = region.getByRole('button', { name: '다음' })
      await next.click()
      await next.click()
      await expect(region.getByText('단계 3: 2번 줄: score 읽기', { exact: true })).toBeVisible()
      await expect(
        region.getByText('전역 스코프에서 찾음 — 초기화 전이라 ReferenceError'),
      ).toBeVisible()
    })

    test('개념 페이지: 프로퍼티 어트리뷰트', async ({ page }) => {
      await page.goto(PROPERTY_ATTRIBUTES_PATH)
      await waitForHydration(page)
      await expect(page.getByRole('button', { name: '정답 확인' }).first()).toBeVisible()
      await expectNoSeriousViolations(page)
    })

    test('개념 페이지: 프로퍼티 어트리뷰트 시뮬레이터를 진행한 뒤', async ({ page }) => {
      test.slow() // 4개 시나리오의 모든 단계에서 axe를 돌린다
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
        // 시나리오의 단계 수는 모두 20 이하이므로 마지막 단계까지 모든 단계를 검사한다.
        for (let i = 0; i < 20 && (await next.isEnabled()); i++) {
          await next.click()
          await expectNoSeriousViolations(page)
        }
        await expect(next).toBeDisabled()
      }
    })

    test('개념 페이지: 프로퍼티 어트리뷰트 시뮬레이터 4단계에서 대입 결과를 보인다', async ({
      page,
    }) => {
      await page.goto(PROPERTY_ATTRIBUTES_PATH)
      await waitForHydration(page)
      const region = page.getByRole('region', { name: PROPERTY_ATTRIBUTES_SIMULATOR_NAME })
      const next = region.getByRole('button', { name: '다음' })

      await region.getByRole('radio', { name: '쓰기 금지: sloppy mode', exact: true }).check()
      for (let i = 0; i < 3; i++) await next.click()
      await expect(
        region.getByText('단계 4: 3번 줄: item.code에 대입', { exact: true }),
      ).toBeVisible()
      await expect(
        region.getByText('writable이 false라 대입이 무시됨 — strict mode가 아니라 오류 없음', {
          exact: true,
        }),
      ).toBeVisible()

      await region.getByRole('radio', { name: '쓰기 금지: strict mode', exact: true }).check()
      for (let i = 0; i < 3; i++) await next.click()
      await expect(
        region.getByText('단계 4: 5번 줄: item.code에 대입', { exact: true }),
      ).toBeVisible()
      await expect(region.getByText('TypeError 발생', { exact: true })).toBeVisible()
    })

    test('개념 페이지: new 연산자', async ({ page }) => {
      await page.goto(NEW_OPERATOR_PATH)
      await waitForHydration(page)
      await expect(page.getByRole('button', { name: '정답 확인' }).first()).toBeVisible()
      await expectNoSeriousViolations(page)
    })

    test('개념 페이지: new 연산자 시뮬레이터를 진행한 뒤', async ({ page }) => {
      test.slow() // 4개 시나리오의 모든 단계에서 axe를 돌린다
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
        // 시나리오의 단계 수는 모두 20 이하이므로 마지막 단계까지 모든 단계를 검사한다.
        for (let i = 0; i < 20 && (await next.isEnabled()); i++) {
          await next.click()
          await expectNoSeriousViolations(page)
        }
        await expect(next).toBeDisabled()
      }
    })

    test('개념 페이지: new 연산자 시뮬레이터 7단계에서 return한 객체가 결과가 된다', async ({
      page,
    }) => {
      await page.goto(NEW_OPERATOR_PATH)
      await waitForHydration(page)
      const region = page.getByRole('region', { name: NEW_OPERATOR_SIMULATOR_NAME })
      const next = region.getByRole('button', { name: '다음' })

      await region.getByRole('radio', { name: '객체를 return하면', exact: true }).check()
      for (let i = 0; i < 6; i++) await next.click()
      await expect(
        region.getByText('단계 7: 결과 결정: return한 객체 B가 결과', { exact: true }),
      ).toBeVisible()
      await expect(region.getByText('결과로 쓰이지 않음', { exact: true })).toBeVisible()
    })

    test('개념 페이지: 프로토타입 체인', async ({ page }) => {
      await page.goto(PROTOTYPE_CHAIN_PATH)
      await waitForHydration(page)
      await expect(page.getByRole('button', { name: '정답 확인' }).first()).toBeVisible()
      await expectNoSeriousViolations(page)
    })

    test('개념 페이지: 프로토타입 체인 시뮬레이터를 진행한 뒤', async ({ page }) => {
      test.slow() // 4개 시나리오의 모든 단계에서 axe를 돌린다
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
        // 시나리오의 단계 수는 모두 20 이하이므로 마지막 단계까지 모든 단계를 검사한다.
        for (let i = 0; i < 20 && (await next.isEnabled()); i++) {
          await next.click()
          await expectNoSeriousViolations(page)
        }
        await expect(next).toBeDisabled()
      }
    })

    test('개념 페이지: 원시 값의 메서드 호출', async ({ page }) => {
      await page.goto(PRIMITIVE_METHODS_PATH)
      await waitForHydration(page)
      await expect(page.getByRole('button', { name: '정답 확인' }).first()).toBeVisible()
      await expectNoSeriousViolations(page)
    })

    test('개념 페이지: 프로토타입 체인 시뮬레이터 10단계에서 체인 끝을 보인다', async ({
      page,
    }) => {
      await page.goto(PROTOTYPE_CHAIN_PATH)
      await waitForHydration(page)
      const region = page.getByRole('region', { name: PROTOTYPE_CHAIN_SIMULATOR_NAME })
      const next = region.getByRole('button', { name: '다음' })

      await region.getByRole('radio', { name: '프로토타입 체인', exact: true }).check()
      for (let i = 0; i < 9; i++) await next.click()
      await expect(region.getByText('단계 10: item.price 읽기', { exact: true })).toBeVisible()
      await expect(region.getByText('null — 체인 끝').first()).toBeVisible()
    })

    test('개념 페이지: this', async ({ page }) => {
      await page.goto(THIS_BINDING_PATH)
      await waitForHydration(page)
      await expect(page.getByRole('button', { name: '정답 확인' }).first()).toBeVisible()
      await expectNoSeriousViolations(page)
    })

    test('개념 페이지: this 시뮬레이터를 진행한 뒤', async ({ page }) => {
      test.slow() // 4개 시나리오의 모든 단계에서 axe를 돌린다
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
        // 시나리오의 단계 수는 모두 20 이하이므로 마지막 단계까지 모든 단계를 검사한다.
        for (let i = 0; i < 20 && (await next.isEnabled()); i++) {
          await next.click()
          await expectNoSeriousViolations(page)
        }
        await expect(next).toBeDisabled()
      }
    })

    test('개념 페이지: this 시뮬레이터 whoAmI() 단계에서 전역 객체를 보인다', async ({ page }) => {
      await page.goto(THIS_BINDING_PATH)
      await waitForHydration(page)
      const region = page.getByRole('region', { name: THIS_BINDING_SIMULATOR_NAME })
      const next = region.getByRole('button', { name: '다음' })

      await region.getByRole('radio', { name: '메서드를 꺼내 호출하면', exact: true }).check()
      for (let i = 0; i < 4; i++) await next.click()
      await expect(
        region.getByText('단계 5: whoAmI(): this는 전역 객체', { exact: true }),
      ).toBeVisible()
      await expect(
        region.getByRole('region', { name: 'this 결정' }).getByText('전역 객체').first(),
      ).toBeVisible()
    })

    test('개념 페이지: 실행 컨텍스트', async ({ page }) => {
      await page.goto(EXECUTION_CONTEXT_PATH)
      await waitForHydration(page)
      await expect(page.getByRole('button', { name: '정답 확인' }).first()).toBeVisible()
      await expectNoSeriousViolations(page)
    })

    test('개념 페이지: 실행 컨텍스트 시뮬레이터를 진행한 뒤', async ({ page }) => {
      test.slow() // 4개 시나리오의 모든 단계에서 axe를 돌린다
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
        // 시나리오의 단계 수는 모두 20 이하이므로 마지막 단계까지 모든 단계를 검사한다.
        for (let i = 0; i < 20 && (await next.isEnabled()); i++) {
          await next.click()
          await expectNoSeriousViolations(page)
        }
        await expect(next).toBeDisabled()
      }
    })

    test('개념 페이지: 실행 컨텍스트 시뮬레이터 label 이름 찾기 단계에서 찾은 곳을 보인다', async ({
      page,
    }) => {
      await page.goto(EXECUTION_CONTEXT_PATH)
      await waitForHydration(page)
      const region = page.getByRole('region', { name: EXECUTION_CONTEXT_SIMULATOR_NAME })
      const next = region.getByRole('button', { name: '다음' })

      await region.getByRole('radio', { name: '이름 찾기와 정의한 곳', exact: true }).check()
      for (let i = 0; i < 6; i++) await next.click()
      await expect(region.getByText('단계 7: label 이름 찾기', { exact: true })).toBeVisible()
      const lookup = region.getByRole('region', { name: '찾기' })
      await expect(lookup.getByText(/^결과:\s*'global'$/)).toBeVisible()
      await expect(lookup.getByText('찾음', { exact: true })).toBeVisible()
    })

    test('개념 페이지: 동등 비교 시뮬레이터를 진행한 뒤', async ({ page }) => {
      test.slow() // 3개 시나리오의 모든 단계에서 axe를 돌리므로 기본 30초에 가깝다
      await page.goto(EQUALITY_PATH)
      await waitForHydration(page)
      const region = page.getByRole('region', { name: EQUALITY_SIMULATOR_NAME })
      for (const scenario of ['숫자와 문자열', '불리언과 비교', 'null과 undefined']) {
        await region.getByRole('radio', { name: scenario, exact: true }).check()
        const next = region.getByRole('button', { name: '다음' })
        // 시나리오의 단계 수는 모두 10 이하이므로 마지막 단계까지 모든 단계를 검사한다.
        for (let i = 0; i < 12 && (await next.isEnabled()); i++) {
          await next.click()
          await expectNoSeriousViolations(page)
        }
        await expect(next).toBeDisabled()
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
