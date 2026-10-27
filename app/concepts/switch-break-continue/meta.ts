import type { ConceptMeta } from '~/lib/concepts'

export const concept = {
  slug: 'switch-break-continue',
  title: 'switch와 break·continue: 실행은 어디로 이어지나',
  summary:
    'switch는 ===로 일치하는 case부터 아래로 이어서 실행하고 break를 만나야 멈춥니다. break는 가장 가까운 반복문이나 switch를 끝내고, continue는 가장 가까운 반복문의 다음 반복으로 넘어갑니다. 실행 위치가 어디로 옮겨 가는지 단계별로 따라갑니다.',
  category: 'fundamentals',
  tags: [
    'switch',
    'case',
    'default',
    'break',
    'continue',
    'fall-through',
    '폴스루',
    '제어문',
    '조건문',
    '반복문',
    'for',
    '레이블',
    '레이블 문',
    'label',
    '일치 비교',
    '===',
    'CaseBlockEvaluation',
    'IsStrictlyEqual',
  ],
  goals: [
    'switch가 ===로 일치하는 첫 case부터 break를 만날 때까지 아래 case의 문장도 실행한다는 것으로 출력을 예측할 수 있다.',
    'default가 어디에 있든 모든 case가 일치하지 않을 때 실행되고, 일치한 뒤에는 아래 case의 식을 평가하지 않는다는 것을 설명할 수 있다.',
    'break는 가장 가까운 반복문이나 switch를 끝내고 continue는 가장 가까운 반복문의 다음 반복으로 넘어간다는 것을 구분해 반복문 안 switch의 실행 흐름을 예측할 수 있다.',
    '레이블을 붙인 break로 바깥 반복문을 끝낼 수 있다는 것과 break·continue를 쓸 수 없는 위치를 설명할 수 있다.',
  ],
  prerequisites: [
    { label: '표현식과 문' },
    { label: 'if 문과 for 문' },
    { label: '함수 선언과 호출' },
    { label: '동등 비교', slug: 'equality-operators' },
    { label: '증감 연산자', slug: 'increment-decrement' },
  ],
  related: ['equality-operators', 'increment-decrement'],
  examples: [
    {
      id: 'fall-through',
      file: 'fall-through.js',
      runtime: 'ecmascript',
      expectedOutput: ['무료 배송', '적립'],
    },
    {
      id: 'strict-match',
      file: 'strict-match.js',
      runtime: 'ecmascript',
      expectedOutput: ['문자열 1'],
    },
    {
      id: 'default-middle',
      file: 'default-middle.js',
      runtime: 'ecmascript',
      expectedOutput: ['확인 필요', '보통'],
    },
    {
      id: 'case-evaluation',
      file: 'case-evaluation.js',
      runtime: 'ecmascript',
      expectedOutput: ['b', 'c', '2'],
    },
    {
      id: 'loop-break-continue',
      file: 'loop-break-continue.js',
      runtime: 'ecmascript',
      expectedOutput: ['1', '3', '끝'],
    },
    {
      id: 'switch-in-loop',
      file: 'switch-in-loop.js',
      runtime: 'ecmascript',
      expectedOutput: ['하나', '1번 끝', '둘', '3번 끝'],
    },
    {
      id: 'label',
      file: 'label.js',
      runtime: 'ecmascript',
      expectedOutput: ['1 1', '1 2', '1 3', '2 1', '끝'],
    },
  ],
  simplifications: [
    '시뮬레이터는 실행 위치를 줄 단위로 보여 줍니다. for 문의 조건식과 증감식은 모두 1번 줄로 표시하고, 증감식 실행과 다음 조건 검사는 한 단계로 묶습니다.',
    '명세는 break·continue 문을 평가하면 break·continue 종류의 완료 기록(Completion Record)을 만들고, 그것을 받은 바깥 문이 처리하도록 정합니다. 시각화는 이것을 "가장 가까운 반복문·switch를 끝냄", "다음 반복으로"라는 이동으로만 보여 줍니다.',
    '명세의 for 문은 let으로 선언한 변수를 반복마다 새로 만들어 이전 반복의 값으로 초기화합니다(CreatePerIterationEnvironment). 시각화는 변수 하나의 값이 바뀌는 것처럼 보여 주고, for 문이 끝나면 그 변수를 표시에서 뺍니다(for 문 밖에서는 쓸 수 없습니다. 스코프는 별도 개념에서 다룹니다).',
    'switch 문이 실행될 때 명세가 만드는 블록 환경(BlockDeclarationInstantiation)과, case마다 선언한 let·const가 하나의 블록을 공유하는 문제는 다루지 않습니다.',
    '반복문은 for만 다룹니다. while·do...while·for...in·for...of에서도 break·continue는 같은 규칙으로 동작합니다. 레이블은 반복문에 붙이는 경우만 다룹니다.',
    '"실행 중인 구조", "fall-through", "회차"는 교육용 이름입니다(fall-through는 흔히 쓰는 용어이고 명세 용어가 아닙니다).',
    'console.log는 호스트 API입니다.',
  ],
  references: [
    {
      label: 'ECMAScript 명세 — The switch Statement',
      url: 'https://tc39.es/ecma262/#sec-switch-statement',
    },
    {
      label: 'ECMAScript 명세 — CaseBlockEvaluation',
      url: 'https://tc39.es/ecma262/#sec-runtime-semantics-caseblockevaluation',
    },
    {
      label: 'ECMAScript 명세 — CaseClauseIsSelected',
      url: 'https://tc39.es/ecma262/#sec-runtime-semantics-caseclauseisselected',
    },
    {
      label: 'ECMAScript 명세 — IsStrictlyEqual',
      url: 'https://tc39.es/ecma262/#sec-isstrictlyequal',
    },
    {
      label: 'ECMAScript 명세 — The break Statement',
      url: 'https://tc39.es/ecma262/#sec-break-statement',
    },
    {
      label: 'ECMAScript 명세 — The continue Statement',
      url: 'https://tc39.es/ecma262/#sec-continue-statement',
    },
    {
      label: 'ECMAScript 명세 — LoopContinues',
      url: 'https://tc39.es/ecma262/#sec-loopcontinues',
    },
    {
      label: 'ECMAScript 명세 — ForBodyEvaluation',
      url: 'https://tc39.es/ecma262/#sec-forbodyevaluation',
    },
    {
      label: 'ECMAScript 명세 — Labelled Statements: LabelledEvaluation',
      url: 'https://tc39.es/ecma262/#sec-runtime-semantics-labelledevaluation',
    },
    {
      label: 'MDN — switch',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Statements/switch',
    },
    {
      label: 'MDN — break',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Statements/break',
    },
    {
      label: 'MDN — continue',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Statements/continue',
    },
    {
      label: 'MDN — label',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Statements/label',
    },
    {
      label: 'MDN — for',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Statements/for',
    },
  ],
  reviewedAt: '2026-10-27',
} satisfies ConceptMeta
