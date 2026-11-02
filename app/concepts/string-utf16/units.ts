export type Sample = {
  id: string
  label: string
  value: string
  note: string
}

export type UnitKind = 'single' | 'high' | 'low' | 'lone-high' | 'lone-low'

export type CodeUnit = {
  index: number
  unit: number
  kind: UnitKind
}

export type CodePoint = {
  start: number
  size: 1 | 2
  codePoint: number
}

// 소스에서 보이지 않거나 바뀌기 쉬운 문자는 \u 이스케이프로 쓴다.
export const samples: Sample[] = [
  {
    id: 'emoji',
    label: 'a😀b',
    value: 'a😀b',
    note: '😀(U+1F600)는 U+FFFF를 넘어서 상위 서로게이트와 하위 서로게이트 두 코드 유닛으로 나타납니다.',
  },
  {
    id: 'hangul',
    label: '가나',
    value: '가나',
    note: '완성형 한글 음절은 U+FFFF 이하라 음절 하나가 코드 유닛 하나입니다.',
  },
  {
    id: 'composed',
    label: 'é (한 코드 포인트)',
    value: '\u00e9',
    note: 'U+00E9 한 코드 포인트라 코드 유닛도 하나입니다.',
  },
  {
    id: 'decomposed',
    label: 'é (e + 결합 부호)',
    value: 'e\u0301',
    note: 'e(U+0065)에 결합 양음 부호(U+0301)가 이어진 것으로, 화면에서는 같아 보여도 코드 유닛이 둘입니다.',
  },
  {
    id: 'family',
    label: '가족 이모지',
    value: '\u{1F468}\u200D\u{1F469}\u200D\u{1F467}',
    note: '이모지 세 개를 ZWJ(U+200D) 두 개로 이은 문자열입니다. 코드 포인트 5개, 코드 유닛 8개입니다.',
  },
]

// 화면에 그려지지 않거나 글자로 보이기 어려운 코드 포인트의 이름
export const names: Record<number, string> = {
  0x200d: 'ZWJ(폭 없는 결합자)',
  0x0301: '결합 양음 부호',
}

export const kindLabels: Record<UnitKind, string> = {
  single: '일반',
  high: '상위 서로게이트',
  low: '하위 서로게이트',
  'lone-high': '짝 없는 상위 서로게이트',
  'lone-low': '짝 없는 하위 서로게이트',
}

const isHigh = (unit: number): boolean => unit >= 0xd800 && unit <= 0xdbff
const isLow = (unit: number): boolean => unit >= 0xdc00 && unit <= 0xdfff

export function toUnits(value: string): CodeUnit[] {
  const units: CodeUnit[] = []
  for (let index = 0; index < value.length; index++) {
    const unit = value.charCodeAt(index)
    let kind: UnitKind = 'single'
    if (isHigh(unit)) {
      const next = index + 1 < value.length ? value.charCodeAt(index + 1) : -1
      kind = isLow(next) ? 'high' : 'lone-high'
    } else if (isLow(unit)) {
      const prev = index > 0 ? value.charCodeAt(index - 1) : -1
      kind = isHigh(prev) ? 'low' : 'lone-low'
    }
    units.push({ index, unit, kind })
  }
  return units
}

export function toCodePoints(value: string): CodePoint[] {
  const points: CodePoint[] = []
  let index = 0
  while (index < value.length) {
    const codePoint = value.codePointAt(index) as number
    const size = codePoint > 0xffff ? 2 : 1
    points.push({ start: index, size, codePoint })
    index += size
  }
  return points
}

// 코드 유닛: 소문자 16진수 4자리 (d83d)
export const formatUnit = (unit: number): string => unit.toString(16).padStart(4, '0')

// 코드 포인트: U+ 다음에 대문자 16진수 4자리 이상 (U+1F600)
export const formatCodePoint = (codePoint: number): string =>
  `U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}`

export const isLoneKind = (kind: UnitKind): boolean => kind === 'lone-high' || kind === 'lone-low'
