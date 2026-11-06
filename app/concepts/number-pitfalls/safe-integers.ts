export type SafeIntegerRow = {
  integer: string
  numberValue: string
  shared: boolean
  safe: boolean
}

// 정수 리터럴이 되는 Number 값은 정확한 정수 문자열로 둔다. concept.test.ts가 BigInt로 다시 검증한다.
export const safeIntegerRows: SafeIntegerRow[] = [
  { integer: '9007199254740990', numberValue: '9007199254740990', shared: false, safe: true },
  { integer: '9007199254740991', numberValue: '9007199254740991', shared: false, safe: true },
  { integer: '9007199254740992', numberValue: '9007199254740992', shared: true, safe: false },
  { integer: '9007199254740993', numberValue: '9007199254740992', shared: true, safe: false },
  { integer: '9007199254740994', numberValue: '9007199254740994', shared: false, safe: false },
  { integer: '9007199254740995', numberValue: '9007199254740996', shared: true, safe: false },
  { integer: '9007199254740996', numberValue: '9007199254740996', shared: true, safe: false },
]
