import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { roundingPresets } from './rounding-presets'
import { safeIntegerRows } from './safe-integers'

// vm 컨텍스트에서 던진 오류는 다른 realm의 객체이므로 name으로 비교한다.
const errorName = (code: string) => {
  try {
    runInNewContext(code)
  } catch (e) {
    return (e as Error).name
  }
  return 'no error'
}

describe('본문 주장 검증', () => {
  it('곱셈 반올림과 저장 값의 관계', () => {
    expect(runInNewContext('0.015 * 100')).toBe(1.5)
    expect(runInNewContext('(0.015).toFixed(2)')).toBe('0.01')
  })

  it('toFixed의 범위 검사는 유한성과 크기 분기보다 먼저다', () => {
    const name = (code: string) => {
      try {
        return runInNewContext(code)
      } catch (e) {
        return (e as Error).name
      }
    }
    expect(name('NaN.toFixed(101)')).toBe('RangeError')
    expect(name('(1e21).toFixed(101)')).toBe('RangeError')
    expect(name('NaN.toPrecision(0)')).toBe('NaN')
    expect(name('(-1e21).toFixed(2)')).toBe('-1e+21')
  })

  it('0.49999999999999994는 Math.round와 Math.floor(x + 0.5)가 다르다', () => {
    expect(runInNewContext('0.49999999999999994 + 0.5 === 1')).toBe(true)
    expect(runInNewContext('Math.round(0.49999999999999994)')).toBe(0)
  })

  it('BigInt는 관계 비교에서 Number와 섞을 수 있고 수학적 값으로 비교한다', () => {
    expect(runInNewContext('1n < 2')).toBe(true)
    expect(runInNewContext('2n > 1.5')).toBe(true)
  })

  it('toExponential도 가운데면 큰 쪽을 고른다', () => {
    expect(runInNewContext('(1.25).toExponential(1)')).toBe('1.3e+0')
  })

  it('EPSILON은 1 이상 2 미만의 간격이고 1 아래 간격은 더 좁다', () => {
    expect(runInNewContext('1 - Number.EPSILON / 2 === 1')).toBe(false)
    expect(runInNewContext('1 + Number.EPSILON / 2 === 1')).toBe(true)
  })

  it('문자열 연결이 아니면 ToNumeric 뒤의 타입 차이로 TypeError다', () => {
    const name = (code: string) => {
      try {
        return runInNewContext(code)
      } catch (e) {
        return (e as Error).name
      }
    }
    expect(name("String(1n + '1')")).toBe('11')
    expect(name("1n * '2'")).toBe('TypeError')
    expect(name('1n + true')).toBe('TypeError')
  })

  it('toFixed는 음수에서도 저장 값을 기준으로 한다', () => {
    expect(runInNewContext('(-1.005).toFixed(2)')).toBe('-1.00')
  })

  it('toPrecision의 가운데 규칙은 절댓값이 큰 쪽이다', () => {
    expect(runInNewContext('(2.5).toPrecision(1)')).toBe('3')
    expect(runInNewContext('(-2.5).toPrecision(1)')).toBe('-3')
  })

  it('toPrecision(0)과 toExponential(101)은 RangeError다', () => {
    expect(errorName('(1.5).toPrecision(0)')).toBe('RangeError')
    expect(errorName('(1.5).toExponential(101)')).toBe('RangeError')
  })

  it('BigInt에 Number를 넘기면 이미 반올림된 값이고 문자열은 정확하다', () => {
    expect(runInNewContext('String(BigInt(9007199254740993))')).toBe('9007199254740992')
    expect(runInNewContext("String(BigInt('9007199254740993'))")).toBe('9007199254740993')
  })

  it('isSafeInteger는 절댓값 범위로 판정한다', () => {
    expect(runInNewContext('Number.isSafeInteger(-(2 ** 53))')).toBe(false)
    expect(runInNewContext('Number.isSafeInteger(Number.MIN_SAFE_INTEGER)')).toBe(true)
  })

  it('toFixed()의 인수를 생략하면 0자리다', () => {
    expect(runInNewContext('(1.5).toFixed()')).toBe('2')
  })

  it('EPSILON 비교는 작은 값에서 서로 다른 값도 같다고 한다', () => {
    const close = (a: number, b: number) => Math.abs(a - b) < Number.EPSILON
    expect(close(1e-20, 2e-20)).toBe(true)
    expect(
      runInNewContext(
        'function close(a, b) { return Math.abs(a - b) < Number.EPSILON; } close(1e-20, 2e-20)',
      ),
    ).toBe(true)
  })

  it('1000.1 + 1000.2와 2000.3의 차이는 2 ** -42다', () => {
    expect(runInNewContext('Math.abs(1000.1 + 1000.2 - 2000.3) === 2 ** -42')).toBe(true)
  })

  it('상대 허용 오차로 비교하면 1000.1 + 1000.2와 2000.3이 같다고 나온다', () => {
    expect(
      runInNewContext(
        'var a = 1000.1 + 1000.2, b = 2000.3; Math.abs(a - b) <= Number.EPSILON * Math.max(Math.abs(a), Math.abs(b))',
      ),
    ).toBe(true)
  })
})

// ---- 판정 보기·정수 표 데이터 검증 (toFixed를 쓰지 않는 독립 계산) ----

// double의 비트를 읽어 |x|를 정확한 분수 num / 10^scale 로 돌려준다.
function exactDecimal(x: number): { num: bigint; scale: number } {
  const dv = new DataView(new ArrayBuffer(8))
  dv.setFloat64(0, Math.abs(x))
  const bits = dv.getBigUint64(0)
  const exp = Number((bits >> 52n) & 0x7ffn)
  const frac = bits & ((1n << 52n) - 1n)
  const mantissa = exp === 0 ? frac : frac | (1n << 52n)
  const k = (exp === 0 ? 1 : exp) - 1075
  // 이 테스트의 값은 모두 소수부가 있는 이진 분수(k < 0)다.
  if (k >= 0) return { num: mantissa << BigInt(k), scale: 0 }
  // m / 2^n = m * 5^n / 10^n
  return { num: mantissa * 5n ** BigInt(-k), scale: -k }
}

function toDecimalString(num: bigint, scale: number): string {
  const s = num.toString().padStart(scale + 1, '0')
  const text = scale === 0 ? s : `${s.slice(0, s.length - scale)}.${s.slice(s.length - scale)}`
  return text.includes('.') ? text.replace(/0+$/, '').replace(/\.$/, '') : text
}

describe('반올림 프리셋 데이터', () => {
  it('프리셋은 6개다', () => {
    expect(roundingPresets).toHaveLength(6)
  })

  for (const p of roundingPresets) {
    describe(p.label, () => {
      const { num, scale } = exactDecimal(p.value)
      const unit = 10n ** BigInt(scale - p.digits) // 10^-digits 한 칸, 10^-scale 단위
      const scaled = (text: string) => {
        const [i, f = ''] = text.split('.')
        return BigInt(i + f.padEnd(scale, '0')) // 10^-scale 단위 정수
      }
      const lowerN = scaled(p.lower)
      const upperN = scaled(p.upper)

      it('stored는 정확한 저장 값이다', () => {
        expect(p.stored).toBe(toDecimalString(num, scale))
      })

      it('lower·upper는 stored를 감싸는 10^-digits 배수다', () => {
        expect(lowerN % unit).toBe(0n)
        expect(upperN - lowerN).toBe(unit)
        expect(lowerN <= num && num <= upperN).toBe(true)
        expect(p.lower.split('.')[1]?.length ?? 0).toBe(p.digits)
        expect(p.upper.split('.')[1]?.length ?? 0).toBe(p.digits)
      })

      it('거리가 정확하다', () => {
        expect(p.lowerDistance).toBe(toDecimalString(num - lowerN, scale))
        expect(p.upperDistance).toBe(toDecimalString(upperN - num, scale))
      })

      it('verdict가 거리 비교와 일치하고 tie는 거리가 같을 때뿐이다', () => {
        const dl = num - lowerN
        const du = upperN - num
        const expected = dl < du ? 'lower' : dl > du ? 'upper' : 'tie'
        expect(p.verdict).toBe(expected)
        expect(p.verdict === 'tie').toBe(dl === du)
      })

      it('result는 실제 toFixed와 같고 tie면 절댓값이 큰 쪽이다', () => {
        expect(p.result).toBe(p.value.toFixed(p.digits))
        const sign = p.value < 0 ? '-' : ''
        if (p.verdict === 'tie') expect(p.result).toBe(sign + p.upper)
        else expect(p.result).toBe(sign + (p.verdict === 'lower' ? p.lower : p.upper))
      })
    })
  }
})

describe('안전한 정수 표 데이터', () => {
  const MAX_SAFE = 2n ** 53n - 1n
  const valueOf = (n: bigint) => String(BigInt(Number(String(n))))
  // 양 끝 행의 이웃까지 비교되도록 넓은 범위를 돈다.
  const counts = new Map<string, number>()
  for (let n = 2n ** 53n - 8n; n <= 2n ** 53n + 16n; n++) {
    const v = valueOf(n)
    counts.set(v, (counts.get(v) ?? 0) + 1)
  }

  it('표는 7행이다', () => {
    expect(safeIntegerRows).toHaveLength(7)
  })

  it('numberValue·shared·safe가 BigInt 계산과 같다', () => {
    for (const row of safeIntegerRows) {
      const n = BigInt(row.integer)
      expect(row.numberValue).toBe(valueOf(n))
      expect(row.shared).toBe((counts.get(valueOf(n)) ?? 0) > 1)
      expect(row.safe).toBe(n >= -MAX_SAFE && n <= MAX_SAFE)
    }
  })

  it('…994 행은 shared false, safe false다', () => {
    const row = safeIntegerRows.find((r) => r.integer === '9007199254740994')
    expect(row).toMatchObject({ numberValue: '9007199254740994', shared: false, safe: false })
  })
})
