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
  CLOSURE_PATH,
  CLOSURE_SIMULATOR_NAME,
  FOR_LET_PATH,
  FOR_LET_SIMULATOR_NAME,
  GLOBAL_OBJECT_PATH,
  IIFE_MODULE_PATTERN_PATH,
  CLASS_BASICS_PATH,
  CLASS_INHERITANCE_PATH,
  CLASS_INHERITANCE_SIMULATOR_NAME,
  ARROW_FUNCTIONS_PATH,
  ARRAY_INDEX_LENGTH_PATH,
  ARRAY_INDEX_LENGTH_SIMULATOR_NAME,
  ARRAY_METHOD_PITFALLS_PATH,
  REGEXP_LASTINDEX_PATH,
  REGEXP_LASTINDEX_SIMULATOR_NAME,
  STRING_UTF16_PATH,
  STRING_UTF16_VIEW_NAME,
  ITERABLE_FOR_OF_PATH,
  ITERABLE_FOR_OF_SIMULATOR_NAME,
  SET_MAP_PATH,
  SPREAD_DESTRUCTURING_PATH,
  SYMBOL_PATH,
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

    test('홈: 학습 순서 보기', async ({ page }) => {
      await page.goto('/?view=order')
      await waitForHydration(page)
      await expect(page.getByRole('heading', { level: 3, name: '학습 순서' })).toBeVisible()
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

    test('개념 페이지: 전역 객체', async ({ page }) => {
      await page.goto(GLOBAL_OBJECT_PATH)
      await waitForHydration(page)
      await expect(page.getByRole('button', { name: '정답 확인' }).first()).toBeVisible()
      await expectNoSeriousViolations(page)
    })

    test('개념 페이지: 즉시 실행 함수와 모듈 패턴', async ({ page }) => {
      await page.goto(IIFE_MODULE_PATTERN_PATH)
      await waitForHydration(page)
      await expect(page.getByRole('button', { name: '정답 확인' }).first()).toBeVisible()
      await expectNoSeriousViolations(page)
    })

    test('개념 페이지: 클래스는 함수다', async ({ page }) => {
      await page.goto(CLASS_BASICS_PATH)
      await waitForHydration(page)
      await expect(page.getByRole('button', { name: '정답 확인' }).first()).toBeVisible()
      await expectNoSeriousViolations(page)
    })

    test('개념 페이지: 클래스 상속과 super', async ({ page }) => {
      await page.goto(CLASS_INHERITANCE_PATH)
      await waitForHydration(page)
      await expect(page.getByRole('button', { name: '정답 확인' }).first()).toBeVisible()
      await expectNoSeriousViolations(page)
    })

    test('개념 페이지: 클래스 상속 시뮬레이터를 진행한 뒤', async ({ page }) => {
      test.slow() // 4개 시나리오의 모든 단계에서 axe를 돌린다
      await page.goto(CLASS_INHERITANCE_PATH)
      await waitForHydration(page)
      const region = page.getByRole('region', { name: CLASS_INHERITANCE_SIMULATOR_NAME })
      for (const scenario of [
        '파생 클래스 객체 만들기',
        'super() 전에 this',
        'super.method() 호출',
        '필드 초기화 순서',
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

    test('개념 페이지: 클래스 상속 시뮬레이터 4단계에서 this가 초기화 전이고 7단계에서 초기화된다', async ({
      page,
    }) => {
      await page.goto(CLASS_INHERITANCE_PATH)
      await waitForHydration(page)
      const region = page.getByRole('region', { name: CLASS_INHERITANCE_SIMULATOR_NAME })
      const next = region.getByRole('button', { name: '다음' })

      await region.getByRole('radio', { name: '파생 클래스 객체 만들기', exact: true }).check()
      for (let i = 0; i < 3; i++) await next.click()
      await expect(
        region.getByText("단계 4: new Dog('Rex'): Dog 생성자 호출, this는 초기화 전", {
          exact: true,
        }),
      ).toBeVisible()
      await expect(region.getByText('초기화 전').first()).toBeVisible()

      for (let i = 0; i < 3; i++) await next.click()
      await expect(
        region.getByText('단계 7: Animal 반환: Dog의 this가 객체 A로 초기화', { exact: true }),
      ).toBeVisible()
    })

    test('개념 페이지: 화살표 함수와 메서드 축약', async ({ page }) => {
      await page.goto(ARROW_FUNCTIONS_PATH)
      await waitForHydration(page)
      await expect(page.getByRole('button', { name: '정답 확인' }).first()).toBeVisible()
      await expectNoSeriousViolations(page)
    })

    test('개념 페이지: 배열은 객체다', async ({ page }) => {
      await page.goto(ARRAY_INDEX_LENGTH_PATH)
      await waitForHydration(page)
      await expect(page.getByRole('button', { name: '정답 확인' }).first()).toBeVisible()
      await expectNoSeriousViolations(page)
    })

    test('개념 페이지: 배열 length 시뮬레이터를 진행한 뒤', async ({ page }) => {
      test.slow() // 3개 시나리오의 모든 단계에서 axe를 돌린다
      await page.goto(ARRAY_INDEX_LENGTH_PATH)
      await waitForHydration(page)
      const region = page.getByRole('region', { name: ARRAY_INDEX_LENGTH_SIMULATOR_NAME })
      for (const scenario of ['인덱스와 length', 'length 줄이고 늘리기', '구멍과 undefined']) {
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

    test('개념 페이지: 배열 메서드의 함정', async ({ page }) => {
      await page.goto(ARRAY_METHOD_PITFALLS_PATH)
      await waitForHydration(page)
      await expect(page.getByRole('button', { name: '정답 확인' }).first()).toBeVisible()
      await expectNoSeriousViolations(page)
    })

    test('개념 페이지: 정규 표현식의 g 플래그', async ({ page }) => {
      await page.goto(REGEXP_LASTINDEX_PATH)
      await waitForHydration(page)
      await expect(page.getByRole('button', { name: '정답 확인' }).first()).toBeVisible()
      await expectNoSeriousViolations(page)
    })

    test('개념 페이지: lastIndex 시뮬레이터를 진행한 뒤', async ({ page }) => {
      test.slow() // 3개 시나리오의 모든 단계에서 axe를 돌린다
      await page.goto(REGEXP_LASTINDEX_PATH)
      await waitForHydration(page)
      const region = page.getByRole('region', { name: REGEXP_LASTINDEX_SIMULATOR_NAME })
      for (const scenario of ['test 결과가 번갈아', 'exec로 모두 찾기', 'filter와 test']) {
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

    test('개념 페이지: lastIndex 시뮬레이터 4단계에서 1에서 시작한 검색이 실패한다', async ({
      page,
    }) => {
      await page.goto(REGEXP_LASTINDEX_PATH)
      await waitForHydration(page)
      const region = page.getByRole('region', { name: REGEXP_LASTINDEX_SIMULATOR_NAME })
      const next = region.getByRole('button', { name: '다음' })

      await region.getByRole('radio', { name: 'test 결과가 번갈아', exact: true }).check()
      for (let i = 0; i < 3; i++) await next.click()
      await expect(
        region.getByText("단계 4: re.test('a'): 1에서 시작해 실패, lastIndex는 0", {
          exact: true,
        }),
      ).toBeVisible()
      await expect(region.getByText('결과: false').first()).toBeVisible()
      await expect(region.getByText('(매치 없음)').first()).toBeVisible()
    })

    test('개념 페이지: 문자열 길이와 UTF-16', async ({ page }) => {
      await page.goto(STRING_UTF16_PATH)
      await waitForHydration(page)
      await expect(page.getByRole('button', { name: '정답 확인' }).first()).toBeVisible()
      await expectNoSeriousViolations(page)
    })

    test('개념 페이지: 코드 유닛 보기의 모든 문자열', async ({ page }) => {
      await page.goto(STRING_UTF16_PATH)
      await waitForHydration(page)
      const region = page.getByRole('region', { name: STRING_UTF16_VIEW_NAME })
      for (const label of [
        'a😀b',
        '가나',
        'é (한 코드 포인트)',
        'é (e + 결합 부호)',
        '가족 이모지',
      ]) {
        await region.getByRole('radio', { name: label, exact: true }).check()
        await expectNoSeriousViolations(page)
      }
    })

    test('개념 페이지: 코드 유닛 보기에서 가족 이모지를 고르면 length 8', async ({ page }) => {
      await page.goto(STRING_UTF16_PATH)
      await waitForHydration(page)
      const region = page.getByRole('region', { name: STRING_UTF16_VIEW_NAME })
      await region.getByRole('radio', { name: '가족 이모지', exact: true }).check()
      await expect(region.getByText('length 8 · 코드 포인트 5개')).toBeVisible()
      await expect(region.getByText('ZWJ(폭 없는 결합자)').first()).toBeVisible()
    })

    test('개념 페이지: 심벌', async ({ page }) => {
      await page.goto(SYMBOL_PATH)
      await waitForHydration(page)
      await expect(page.getByRole('button', { name: '정답 확인' }).first()).toBeVisible()
      await expectNoSeriousViolations(page)
    })

    test('개념 페이지: 이터러블과 for...of', async ({ page }) => {
      await page.goto(ITERABLE_FOR_OF_PATH)
      await waitForHydration(page)
      await expect(page.getByRole('button', { name: '정답 확인' }).first()).toBeVisible()
      await expectNoSeriousViolations(page)
    })

    test('개념 페이지: 이터레이터 시뮬레이터를 진행한 뒤', async ({ page }) => {
      test.slow() // 2개 시나리오의 모든 단계에서 axe를 돌린다
      await page.goto(ITERABLE_FOR_OF_PATH)
      await waitForHydration(page)
      const region = page.getByRole('region', { name: ITERABLE_FOR_OF_SIMULATOR_NAME })
      for (const scenario of ['배열을 for...of로', '직접 만든 이터러블과 break']) {
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

    test('개념 페이지: 이터레이터 시뮬레이터에서 break 뒤 return이 불린다', async ({ page }) => {
      await page.goto(ITERABLE_FOR_OF_PATH)
      await waitForHydration(page)
      const region = page.getByRole('region', { name: ITERABLE_FOR_OF_SIMULATOR_NAME })
      const next = region.getByRole('button', { name: '다음' })

      await region.getByRole('radio', { name: '직접 만든 이터러블과 break', exact: true }).check()
      // 12번 누르면 13단계: return 메서드가 결과를 돌려준 단계에 return() 호출이 기록된다.
      for (let i = 0; i < 12; i++) await next.click()
      await expect(
        region.getByText('단계 13: return 메서드 안: { done: true }를 돌려주고 루프 끝', {
          exact: true,
        }),
      ).toBeVisible()
      await expect(region.getByRole('list', { name: '이번 단계의 호출' })).toHaveText('return()')
      await expect(next).toBeDisabled()
    })

    test('개념 페이지: 스프레드와 디스트럭처링', async ({ page }) => {
      await page.goto(SPREAD_DESTRUCTURING_PATH)
      await waitForHydration(page)
      await expect(page.getByRole('button', { name: '정답 확인' }).first()).toBeVisible()
      await expectNoSeriousViolations(page)
    })

    test('개념 페이지: Set과 Map', async ({ page }) => {
      await page.goto(SET_MAP_PATH)
      await waitForHydration(page)
      await expect(page.getByRole('button', { name: '정답 확인' }).first()).toBeVisible()
      await expectNoSeriousViolations(page)
    })

    test('개념 페이지: 배열 length 시뮬레이터 5단계에서 length가 5이고 구멍이 보인다', async ({
      page,
    }) => {
      await page.goto(ARRAY_INDEX_LENGTH_PATH)
      await waitForHydration(page)
      const region = page.getByRole('region', { name: ARRAY_INDEX_LENGTH_SIMULATOR_NAME })
      const next = region.getByRole('button', { name: '다음' })

      await region.getByRole('radio', { name: '인덱스와 length', exact: true }).check()
      for (let i = 0; i < 4; i++) await next.click()
      await expect(
        region.getByText('단계 5: fruits[4]에 대입: length가 5로', { exact: true }),
      ).toBeVisible()
      await expect(region.getByText('구멍').first()).toBeVisible()
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

    test('개념 페이지: 클로저', async ({ page }) => {
      await page.goto(CLOSURE_PATH)
      await waitForHydration(page)
      await expect(page.getByRole('button', { name: '정답 확인' }).first()).toBeVisible()
      await expectNoSeriousViolations(page)
    })

    test('개념 페이지: 클로저 시뮬레이터를 진행한 뒤', async ({ page }) => {
      test.slow() // 4개 시나리오의 모든 단계에서 axe를 돌린다
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
        // 시나리오의 단계 수는 모두 20 이하이므로 마지막 단계까지 모든 단계를 검사한다.
        for (let i = 0; i < 20 && (await next.isEnabled()); i++) {
          await next.click()
          await expectNoSeriousViolations(page)
        }
        await expect(next).toBeDisabled()
      }
    })

    test('개념 페이지: 클로저 시뮬레이터 makeCounter 반환 단계에서 남아 있음을 보인다', async ({
      page,
    }) => {
      await page.goto(CLOSURE_PATH)
      await waitForHydration(page)
      const region = page.getByRole('region', { name: CLOSURE_SIMULATOR_NAME })
      const next = region.getByRole('button', { name: '다음' })

      await region
        .getByRole('radio', { name: '바깥 함수가 끝난 뒤에도 남는 환경', exact: true })
        .check()
      for (let i = 0; i < 4; i++) await next.click()
      await expect(
        region.getByText('단계 5: makeCounter 반환: 컨텍스트 빠짐, next 초기화', {
          exact: true,
        }),
      ).toBeVisible()
      await expect(region.getByText('남아 있음', { exact: true }).first()).toBeVisible()
    })

    test('개념 페이지: for 문의 let', async ({ page }) => {
      await page.goto(FOR_LET_PATH)
      await waitForHydration(page)
      await expect(page.getByRole('button', { name: '정답 확인' }).first()).toBeVisible()
      await expectNoSeriousViolations(page)
    })

    test('개념 페이지: for 문의 let 시뮬레이터를 진행한 뒤', async ({ page }) => {
      test.slow() // 3개 시나리오의 모든 단계에서 axe를 돌린다
      await page.goto(FOR_LET_PATH)
      await waitForHydration(page)
      const region = page.getByRole('region', { name: FOR_LET_SIMULATOR_NAME })
      for (const scenario of [
        'var: 함수들이 같은 i를 가리킴',
        'let: 반복마다 새 레코드',
        '새 바인딩은 본문 뒤, 증가식 앞',
      ]) {
        await region.getByRole('radio', { name: scenario, exact: true }).check()
        const next = region.getByRole('button', { name: '다음' })
        // 시나리오의 단계 수는 모두 19 이하이므로 마지막 단계까지 모든 단계를 검사한다.
        for (let i = 0; i < 22 && (await next.isEnabled()); i++) {
          await next.click()
          await expectNoSeriousViolations(page)
        }
        await expect(next).toBeDisabled()
      }
    })

    test('개념 페이지: for 문의 let 시뮬레이터 새 반복 레코드 단계에서 이전 레코드가 남아 있음을 보인다', async ({
      page,
    }) => {
      await page.goto(FOR_LET_PATH)
      await waitForHydration(page)
      const region = page.getByRole('region', { name: FOR_LET_SIMULATOR_NAME })
      const next = region.getByRole('button', { name: '다음' })

      await region.getByRole('radio', { name: 'let: 반복마다 새 레코드', exact: true }).check()
      for (let i = 0; i < 7; i++) await next.click()
      await expect(region.getByText('단계 8: 새 반복 레코드', { exact: true })).toBeVisible()
      await expect(region.getByText('남아 있음', { exact: true }).first()).toBeVisible()
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

test.describe('홈: 보기 방식 키보드 조작', () => {
  for (const key of ['Space', 'Enter']) {
    test(`Tab으로 버튼에 도달해 ${key} 키로 전환한다`, async ({ page }) => {
      await page.goto('/')
      await waitForHydration(page)
      const group = page.getByRole('group', { name: '보기 방식' })
      const category = group.getByRole('button', { name: '분류별' })
      const order = group.getByRole('button', { name: '학습 순서' })

      await page.getByRole('searchbox', { name: '개념 검색' }).focus()
      await page.keyboard.press('Tab')
      await expect(category).toBeFocused()
      await page.keyboard.press('Tab')
      await expect(order).toBeFocused()
      await expect(order).toHaveAttribute('aria-pressed', 'false')

      await page.keyboard.press(key)
      await expect(order).toHaveAttribute('aria-pressed', 'true')
      await expect(category).toHaveAttribute('aria-pressed', 'false')
      await expect(page).toHaveURL(/\?view=order$/)

      await page.keyboard.press('Shift+Tab')
      await expect(category).toBeFocused()
      await page.keyboard.press(key)
      await expect(category).toHaveAttribute('aria-pressed', 'true')
      await expect(order).toHaveAttribute('aria-pressed', 'false')
      expect(new URL(page.url()).searchParams.has('view')).toBe(false)
    })
  }
})

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
