export type RoundingPreset = {
  id: string
  label: string
  value: number
  digits: number
  stored: string
  lower: string
  upper: string
  lowerDistance: string
  upperDistance: string
  verdict: 'lower' | 'upper' | 'tie'
  result: string
  note: string
}

// 문자열은 값을 계산 스크립트로 구한 정확한 십진 표현이다. concept.test.ts가 독립 계산으로 다시 검증한다.
export const roundingPresets: RoundingPreset[] = [
  {
    id: 'v1005',
    label: '(1.005).toFixed(2)',
    value: 1.005,
    digits: 2,
    stored: '1.00499999999999989341858963598497211933135986328125',
    lower: '1.00',
    upper: '1.01',
    lowerDistance: '0.00499999999999989341858963598497211933135986328125',
    upperDistance: '0.00500000000000010658141036401502788066864013671875',
    verdict: 'lower',
    result: '1.00',
    note: '십진 표기 1.005는 1.00과 1.01의 가운데처럼 보이지만, 실제 저장된 값은 1.005보다 조금 작아서 1.00이 더 가깝습니다.',
  },
  {
    id: 'v1015',
    label: '(1.015).toFixed(2)',
    value: 1.015,
    digits: 2,
    stored: '1.0149999999999999023003738329862244427204132080078125',
    lower: '1.01',
    upper: '1.02',
    lowerDistance: '0.0049999999999999023003738329862244427204132080078125',
    upperDistance: '0.0050000000000000976996261670137755572795867919921875',
    verdict: 'lower',
    result: '1.01',
    note: '저장된 값이 1.015보다 조금 작아서 아래 후보 1.01이 더 가깝습니다.',
  },
  {
    id: 'v8345',
    label: '(8.345).toFixed(2)',
    value: 8.345,
    digits: 2,
    stored: '8.3450000000000006394884621840901672840118408203125',
    lower: '8.34',
    upper: '8.35',
    lowerDistance: '0.0050000000000006394884621840901672840118408203125',
    upperDistance: '0.0049999999999993605115378159098327159881591796875',
    verdict: 'upper',
    result: '8.35',
    note: '저장된 값이 8.345보다 조금 커서 위 후보 8.35가 더 가깝습니다.',
  },
  {
    id: 'v25',
    label: '(2.5).toFixed(0)',
    value: 2.5,
    digits: 0,
    stored: '2.5',
    lower: '2',
    upper: '3',
    lowerDistance: '0.5',
    upperDistance: '0.5',
    verdict: 'tie',
    result: '3',
    note: '2.5는 정확히 표현되는 값이라 두 후보와 거리가 같습니다. 이때 toFixed는 부호를 뗀 값 기준으로 큰 쪽을 고릅니다.',
  },
  {
    id: 'v0125',
    label: '(0.125).toFixed(2)',
    value: 0.125,
    digits: 2,
    stored: '0.125',
    lower: '0.12',
    upper: '0.13',
    lowerDistance: '0.005',
    upperDistance: '0.005',
    verdict: 'tie',
    result: '0.13',
    note: '0.125는 정확히 표현되는 값이라 두 후보와 거리가 같고, toFixed는 부호를 뗀 값 기준으로 큰 쪽인 0.13을 고릅니다.',
  },
  {
    id: 'vneg25',
    label: '(-2.5).toFixed(0)',
    value: -2.5,
    digits: 0,
    stored: '2.5',
    lower: '2',
    upper: '3',
    lowerDistance: '0.5',
    upperDistance: '0.5',
    verdict: 'tie',
    result: '-3',
    note: '음수는 부호를 뗀 2.5로 판정해 3을 고른 다음 결과에 부호를 붙이므로 -3입니다.',
  },
]
