import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { assertScenarioInvariants } from '../../../tests/helpers/scenario-invariants'
import { runExample } from '../../../tests/helpers/run-example'
import { concept } from './meta'
import { scenarios, type DateFieldsState } from './scenarios'

const examplesDir = join(import.meta.dirname, 'examples')
const readExample = (file: string) => readFileSync(join(examplesDir, file), 'utf8')
const exampleOf = (id: string) => concept.examples.find((e) => e.id === id)!

// 시간대는 호스트가 정한다. 같은 프로세스 안에서 process.env.TZ를 바꾸면 이후 vm 실행에 반영된다.
// 어떤 경우에도 원래 값(없었으면 없음)으로 되돌린다.
function withTZ<T>(tz: string, fn: () => T): T {
  const original = process.env.TZ
  process.env.TZ = tz
  try {
    return fn()
  } finally {
    if (original === undefined) delete process.env.TZ
    else process.env.TZ = original
  }
}

// vm 컨텍스트에서 던진 오류는 다른 realm의 객체이므로 name으로 비교한다.
const errorName = (code: string) => {
  try {
    runInNewContext(code)
  } catch (e) {
    return (e as Error).name
  }
  return 'no error'
}

// 시간대에 따라 결과가 달라질 수 있는 주장을 확인한 시간대 16개(서머타임 유무, 남반구, 30·45분 오프셋, 날짜 변경선 근처 포함).
const TIME_ZONES = [
  'UTC',
  'Asia/Seoul',
  'America/New_York',
  'America/Los_Angeles',
  'America/Santiago',
  'America/Sao_Paulo',
  'America/Havana',
  'Asia/Beirut',
  'Pacific/Kiritimati',
  'Pacific/Pago_Pago',
  'Australia/Lord_Howe',
  'Asia/Kathmandu',
  'America/St_Johns',
  'Europe/London',
  'Africa/Casablanca',
  'Pacific/Chatham',
]

describe('시간대 전환', () => {
  it('TZ를 바꾸면 같은 프로세스의 vm 실행에 반영되고 끝나면 원래 값으로 돌아온다', () => {
    const original = process.env.TZ
    const offset = () => runInNewContext('new Date(2026, 10, 10).getTimezoneOffset()') as number
    expect(withTZ('America/New_York', offset)).toBe(300)
    expect(withTZ('Asia/Seoul', offset)).toBe(-540)
    expect(process.env.TZ).toBe(original)
  })

  it('원래 TZ가 없었으면 withTZ가 끝난 뒤에도 없다', () => {
    const original = process.env.TZ
    delete process.env.TZ
    try {
      withTZ('Asia/Seoul', () => undefined)
      expect('TZ' in process.env).toBe(false)
    } finally {
      if (original === undefined) delete process.env.TZ
      else process.env.TZ = original
    }
  })

  it.each(TIME_ZONES)('%s에서 예제 12개의 출력이 expectedOutput과 같다', (tz) => {
    withTZ(tz, () => {
      expect(concept.examples).toHaveLength(12)
      for (const example of concept.examples) {
        expect(
          runExample(readExample(example.file)),
          `${tz}: 예제 "${example.id}"의 출력이 다릅니다`,
        ).toEqual(example.expectedOutput)
      }
    })
  })
})

describe('본문 근거 (시간대를 고정해 확인)', () => {
  const dayOfDateOnly = () => runInNewContext("new Date('2026-11-10').getDate()") as number

  it('날짜만 쓴 문자열은 UTC 자정이라 로컬 일이 뉴욕에서는 9, 서울에서는 10이다', () => {
    expect(withTZ('America/New_York', dayOfDateOnly)).toBe(9)
    expect(withTZ('Asia/Seoul', dayOfDateOnly)).toBe(10)
  })

  it('뉴욕에서 서머타임이 시작되는 날, 86400000ms를 더하면 시각이 13시이고 setDate로 더하면 12시다', () => {
    const result = withTZ('America/New_York', () =>
      runInNewContext(`
        const base = new Date(2026, 2, 7, 12);
        const byMs = new Date(base.getTime() + 86400000);
        const byDate = new Date(base.getTime());
        byDate.setDate(byDate.getDate() + 1);
        JSON.stringify([byMs.getHours(), byDate.getHours(), byDate - byMs]);
      `),
    )
    expect(JSON.parse(result as string)).toEqual([13, 12, -3600000])
    const base = withTZ('America/New_York', () =>
      runInNewContext(`
        const base = new Date(2026, 2, 7, 12);
        const byDate = new Date(base.getTime());
        byDate.setDate(byDate.getDate() + 1);
        byDate - base;
      `),
    )
    expect(base).toBe(82800000)
  })

  it('시각 값이 NaN인 Date의 toISOString은 RangeError다', () => {
    expect(errorName('new Date(NaN).toISOString()')).toBe('RangeError')
  })

  it('NaN인 Date에 setFullYear(2026)을 하면 +0에서 계산해 로컬 1월 1일 0시가 된다', () => {
    const code = `
      const d = new Date(NaN);
      d.setFullYear(2026);
      [d.getMonth(), d.getDate(), d.getHours()].join(' ');
    `
    expect(runInNewContext(code)).toBe('0 1 0')
    expect(withTZ('Asia/Seoul', () => runInNewContext(code))).toBe('0 1 0')
  })

  it('NaN인 Date의 다른 setter(setDate)는 NaN을 돌려준다', () => {
    expect(runInNewContext('new Date(NaN).setDate(1)')).toBeNaN()
  })

  it('NaN인 Date에서도 setUTCFullYear는 +0에서 계산하고 setTime은 새 값을 넣는다', () => {
    expect(
      runInNewContext('const d = new Date(NaN); d.setUTCFullYear(2026); d.toISOString()'),
    ).toBe('2026-01-01T00:00:00.000Z')
    expect(runInNewContext('const d = new Date(NaN); d.setTime(0); d.getTime()')).toBe(0)
  })

  it('두 자리 연도는 Date.UTC에서도 1900을 더하지만 setFullYear는 그대로 쓴다', () => {
    expect(runInNewContext('new Date(Date.UTC(99, 0, 1)).getUTCFullYear()')).toBe(1999)
    expect(
      runInNewContext(
        'const d = new Date(Date.UTC(2026, 0, 1)); d.setUTCFullYear(99); d.getUTCFullYear()',
      ),
    ).toBe(99)
  })

  it('1월 31일에 setMonth(3)을 하면 4월 31일이 넘쳐 5월 1일이다', () => {
    expect(
      runInNewContext(
        'const d = new Date(2026, 0, 31); d.setMonth(3); d.getMonth() + " " + d.getDate()',
      ),
    ).toBe('4 1')
  })

  it('Date와 원시 값의 ==는 기본 힌트로 Date를 문자열로 바꾼다', () => {
    expect(runInNewContext('const d = new Date(0); d == d.getTime()')).toBe(false)
    expect(runInNewContext('const d = new Date(0); d == String(d)')).toBe(true)
  })

  it('TimeClip은 소수부를 0 쪽으로 버린다', () => {
    expect(runInNewContext('new Date(1.9).getTime()')).toBe(1)
    expect(runInNewContext('new Date(-1.9).getTime()')).toBe(-1)
  })

  it('서울에서 getTimezoneOffset()은 -540이고 시각까지 쓴 문자열이 날짜만 쓴 문자열보다 이르다', () => {
    const code = `
      const dateOnly = new Date('2026-11-10');
      const dateTime = new Date('2026-11-10T00:00');
      [dateTime.getTimezoneOffset(), dateTime - dateOnly < 0].join(' ');
    `
    expect(withTZ('Asia/Seoul', () => runInNewContext(code))).toBe('-540 true')
  })

  it('toString·toUTCString이 만든 문자열은 원래 시각 값으로 되읽힌다', () => {
    const code = `
      const d = new Date(2026, 10, 10, 9, 30);
      [Date.parse(d.toString()) === d.getTime(), Date.parse(d.toUTCString()) === d.getTime()].join(' ');
    `
    for (const tz of ['UTC', 'Asia/Seoul', 'America/New_York']) {
      expect(
        withTZ(tz, () => runInNewContext(code)),
        tz,
      ).toBe('true true')
    }
  })

  it('오프셋 Z를 붙인 문자열은 시각까지 썼어도 UTC로 읽힌다', () => {
    const code = "new Date('2026-11-10T00:00Z').getTime() === Date.UTC(2026, 10, 10)"
    expect(withTZ('America/New_York', () => runInNewContext(code))).toBe(true)
    expect(withTZ('Asia/Seoul', () => runInNewContext(code))).toBe(true)
  })

  it('new 없이 부른 Date는 인수를 쓰지 않고 현재 시각의 문자열을 돌려준다', () => {
    expect(runInNewContext("Date(2000, 0, 1).includes('2000')")).toBe(false)
  })

  it('부록 B의 setYear도 NaN인 Date에서 +0에서 출발하고 두 자리 연도에 1900을 더한다', () => {
    expect(
      runInNewContext(
        'const d = new Date(NaN); d.setYear(99); [d.getFullYear(), d.getMonth(), d.getDate()].join(" ")',
      ),
    ).toBe('1999 0 1')
  })

  it('일을 함께 주면 setMonth가 31일에서 넘치지 않는다', () => {
    expect(
      runInNewContext(
        'const d = new Date(2026, 0, 31); d.setMonth(1, 1); d.getMonth() + " " + d.getDate()',
      ),
    ).toBe('1 1')
  })
})

describe.each(scenarios)('시나리오 $id', (scenario) => {
  const example = exampleOf(scenario.exampleId)
  const source = readExample(example.file)
  const last = scenario.steps[scenario.steps.length - 1].state

  it('공통 불변식(코드 원문, 출력, 줄 범위)', () => {
    assertScenarioInvariants(scenario, example, source)
  })

  it('첫 단계: 프리렌더에서 읽히는 실행 전 상태(변수·계산·출력 없음)', () => {
    const first = scenario.steps[0]
    expect(first.title).toBe('실행 전')
    expect(first.state).toEqual({ dates: [], calc: null })
    expect(first.line).toBeUndefined()
    expect(first.output).toEqual([])
  })

  it('MakeDay 계산 칸이 명세 규칙과 맞는다(UTC 계산이라 시간대와 무관)', () => {
    const withCalc = scenario.steps.filter((s) => s.state.calc !== null)
    expect(withCalc.length).toBeGreaterThan(0)
    for (const s of withCalc) {
      const c = s.state.calc!
      const where = `${scenario.id} / ${s.title}`
      expect(c.balancedYear, where).toBe(c.input.year + Math.floor(c.input.month / 12))
      expect(c.balancedMonth, where).toBe(((c.input.month % 12) + 12) % 12)
      expect(c.firstOfMonth, where).toEqual({
        year: c.balancedYear,
        month: c.balancedMonth,
        day: 1,
      })
      expect(c.addDays, where).toBe(c.input.day - 1)
      const utc = Date.UTC(c.balancedYear, c.balancedMonth, 1) + c.addDays * 86400000
      const r = new Date(utc)
      expect(c.result, where).toEqual({
        year: r.getUTCFullYear(),
        month: r.getUTCMonth(),
        day: r.getUTCDate(),
      })
    }
  })

  it('마지막 단계의 dates가 예제를 실제로 실행한 로컬 필드와 같다', () => {
    const names = last.dates.map((d) => d.name)
    const expr = `JSON.stringify({${names
      .map((n) => `${n}: [${n}.getFullYear(), ${n}.getMonth(), ${n}.getDate()]`)
      .join(', ')}})`
    for (const tz of ['UTC', 'Asia/Seoul', 'America/New_York']) {
      const actual = withTZ(tz, () => JSON.parse(runInNewContext(`${source}\n;${expr}`) as string))
      const expected = Object.fromEntries(
        last.dates.map((d) => [d.name, [d.fields.year, d.fields.month, d.fields.day]]),
      )
      expect(actual, tz).toEqual(expected)
    }
  })

  it('변수 이름은 단계 안에서 유일하고 한번 생긴 변수는 사라지지 않는다', () => {
    let previous: DateFieldsState['dates'] = []
    for (const s of scenario.steps) {
      const names = s.state.dates.map((d) => d.name)
      expect(new Set(names).size, s.title).toBe(names.length)
      for (const p of previous) expect(names, s.title).toContain(p.name)
      previous = s.state.dates
    }
  })
})
