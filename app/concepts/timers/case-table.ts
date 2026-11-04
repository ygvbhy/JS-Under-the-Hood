// 본문 "상황별 결과표"의 데이터. content.mdx와 concept.test.ts가 함께 쓴다(본문 표와 검증이 어긋나지 않게).
// 행마다 evidence는 예제 id와 그 예제의 expectedOutput에 이 순서대로(연속하지 않아도 된다) 나타나야 하는 출력 줄을 가리킨다.
// expectedOutput 자체는 tests/examples.test.ts가 실제 Chromium에서 실행해 대조한다.
// code는 본문에서 <code>로 보이는 코드이고, situation·result·rule은 일반 글이다.
export const columns: { key: string; label: string }[] = [
  { key: 'situation', label: '상황' },
  { key: 'code', label: '코드' },
  { key: 'result', label: '결과' },
  { key: 'rule', label: '근거 규칙' },
]

export const rows: {
  situation: string
  code: string
  result: string
  rule: string
  evidence: { example: string; lines: string[] }
}[] = [
  {
    situation: '0ms 타이머',
    code: 'setTimeout(f, 0)',
    result: '동기 코드가 모두 끝난 뒤에 실행된다',
    rule: '콜백은 타이머 태스크로 큐에 들어가므로, 지금 실행 중인 스크립트가 끝나야 실행된다',
    evidence: { example: 'sync-first', lines: ['스크립트 끝', '타이머 0ms'] },
  },
  {
    situation: '등록 뒤 동기 코드가 50ms 막음',
    code: 'setTimeout(f, 10)',
    result: '50ms가 지난 뒤에야 실행된다',
    rule: '지연 값은 "최소한 이만큼 기다린다"이며 정확한 실행 시각을 보장하지 않는다',
    evidence: {
      example: 'blocking',
      lines: ['동기 코드 끝, 50ms 이상 지남 true', '타이머 실행, 50ms 이상 지남 true'],
    },
  },
  {
    situation: '같은 지연',
    code: 'setTimeout(a, 50); setTimeout(b, 50)',
    result: '먼저 등록한 것이 먼저 실행된다',
    rule: '먼저 등록했고 지연이 같거나 짧은 타이머보다 먼저 큐에 들어가지 않는다',
    evidence: { example: 'same-delay', lines: ['a 50ms', 'b 50ms', 'd 50ms'] },
  },
  {
    situation: '나중에 등록한 더 짧은 지연',
    code: 'setTimeout(a, 50); setTimeout(c, 0)',
    result: 'Chromium에서는 c가 먼저 실행된다',
    rule: '먼저 등록한 a의 지연이 더 길면 표준은 둘의 순서를 정하지 않는다(Chromium에서 관찰한 결과)',
    evidence: { example: 'same-delay', lines: ['c 0ms', 'a 50ms'] },
  },
  {
    situation: 'clearTimeout',
    code: 'clearTimeout(a)',
    result: '아직 실행 전인 a의 콜백이 실행되지 않는다',
    rule: 'id를 맵에서 지우면 태스크가 실행될 때 맵에 id가 없어 중단한다',
    evidence: { example: 'clear', lines: ['id number true true', 'b 실행'] },
  },
  {
    situation: '다른 콜백에서 지우기',
    code: 'setTimeout(() => clearTimeout(c), 0); c = setTimeout(f, 50)',
    result: '50ms 타이머 c가 실행되지 않는다',
    rule: '먼저 등록한 더 짧은 d가 먼저 실행되고, 아직 실행되지 않은 c는 그 콜백에서 id로 지울 수 있다',
    evidence: { example: 'clear', lines: ['b 실행', 'd가 c를 지움'] },
  },
  {
    situation: 'clearInterval로 setTimeout 지우기',
    code: 'clearInterval(once)',
    result: 'setTimeout으로 만든 타이머가 지워진다',
    rule: 'clearTimeout과 clearInterval은 같은 id 맵에서 항목을 지운다',
    evidence: { example: 'interval', lines: ['등록 끝', 'tick 1'] },
  },
  {
    situation: '같은 id로 interval 멈추기',
    code: 'clearTimeout(id)',
    result: '세 번째 tick 뒤에 반복이 멈춘다',
    rule: '반복 타이머는 콜백 뒤 같은 id로 다시 예약되므로 처음 받은 id로 멈출 수 있다',
    evidence: { example: 'interval', lines: ['tick 1', 'tick 2', 'tick 3'] },
  },
  {
    situation: '추가 인수',
    code: 'setTimeout(f, 0, "x", "y")',
    result: '콜백이 "x", "y"를 인수로 받는다',
    rule: '세 번째 인수부터는 콜백 호출의 인수로 전달된다',
    evidence: { example: 'args-this', lines: ['인수 x y'] },
  },
  {
    situation: 'strict 콜백의 this',
    code: 'setTimeout(function () { "use strict"; this }, 0)',
    result: 'this는 undefined가 아니라 window다',
    rule: '타이머는 콜백을 호출할 때 this 값을 window(WindowProxy)로 지정한다',
    evidence: {
      example: 'args-this',
      lines: ['strict 직접 호출 this undefined', 'strict 콜백 this는 window true'],
    },
  },
  {
    situation: '메서드를 그대로 넘김',
    code: 'setTimeout(user.hello, 0)',
    result: 'this가 user가 아니어서 nick을 읽지 못한다',
    rule: '함수만 넘어가 user 없이 불리므로 this는 window다. 감싸는 함수나 bind로 user를 지킨다',
    evidence: { example: 'args-this', lines: ['hello undefined', 'hello kim', 'hello kim'] },
  },
  {
    situation: '음수, NaN, Infinity, 2 ** 31',
    code: 'setTimeout(f, 2 ** 31)',
    result: '모두 0ms처럼 곧바로 실행된다',
    rule: 'Web IDL long 변환에서 NaN·Infinity는 0, 2 ** 31은 -2147483648이 되고, 타이머가 음수를 0으로 바꾼다',
    evidence: {
      example: 'delay-convert',
      lines: ['2 ** 31', '-100', 'NaN', 'Infinity', '200ms 타이머'],
    },
  },
  {
    situation: '2 ** 32 + 30',
    code: 'setTimeout(f, 2 ** 32 + 30)',
    result: '30ms 타이머가 된다',
    rule: 'long 변환은 2의 32제곱으로 나눈 나머지를 쓰므로 큰 값이 모두 0이 되지는 않는다',
    evidence: { example: 'delay-convert', lines: ['문자열 30', '2 ** 32 + 30', '200ms 타이머'] },
  },
  {
    situation: '디바운스',
    code: 'clearTimeout(timer); timer = setTimeout(f, 50)',
    result: '연속 호출은 마지막 값으로 한 번만 실행된다',
    rule: '매번 이전 타이머를 지우고 새로 예약하며, 클로저가 timer 변수를 기억한다',
    evidence: { example: 'debounce', lines: ['반복 끝', '저장 초안5 1번째', '저장 최종 2번째'] },
  },
]
