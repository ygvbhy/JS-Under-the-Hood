import type { ConceptMeta } from '~/lib/concepts'

export const concept = {
  slug: 'primitives-and-objects',
  title: '원시 값과 객체: 재할당과 변경',
  summary:
    '변수에 다른 값을 넣는 재할당과 객체의 내용을 바꾸는 변경을 구분하면, 원시 값과 객체를 다룰 때 결과가 달라지는 이유를 설명할 수 있습니다.',
  category: 'fundamentals',
  tags: ['원시 값', '객체', '재할당', '변경', 'const', '함수 인수'],
  goals: [
    '원시 값은 바꿀 수 없고(불변) 객체는 바꿀 수 있다(가변)는 차이를 설명할 수 있다.',
    '재할당과 변경을 구분하고, 각각이 다른 변수에 영향을 주는지 예측할 수 있다.',
    'const가 막는 것(재할당)과 막지 않는 것(객체 변경)을 구분할 수 있다.',
    '객체를 함수에 전달했을 때 프로퍼티 변경과 매개변수 재할당의 결과가 다른 이유를 설명할 수 있다.',
  ],
  prerequisites: [{ label: '변수와 선언' }, { label: '데이터 타입' }, { label: '함수 호출' }],
  related: [],
  examples: [
    { id: 'reassign', file: 'reassign.js', runtime: 'ecmascript', expectedOutput: ['10 20 1 2'] },
    { id: 'mutate', file: 'mutate.js', runtime: 'ecmascript', expectedOutput: ['2 true'] },
    {
      id: 'pass-to-function',
      file: 'pass-to-function.js',
      runtime: 'ecmascript',
      expectedOutput: ['99 1'],
    },
  ],
  simplifications: [
    '명세는 값이 어디에 어떻게 저장되는지(스택, 힙, 메모리 주소)를 정하지 않고, 관찰할 수 있는 동작만 정합니다. ‘객체 A’, ‘객체 B’는 같은 객체인지 구분하기 위한 교육용 이름이며 메모리 주소가 아닙니다.',
    '‘값이 복사된다’는 흔한 표현은 교육용 비유입니다. 명세에서 대입(b = a)과 선언 시 초기화(let b = a)는 모두 오른쪽 식을 평가해 얻은 값을 변수에 넣을 뿐이며, 값을 복사하는 별도의 단계는 없습니다. 결과의 차이는 재할당과 변경의 차이에서 생깁니다.',
    '변수는 선언문이 실행된 뒤에만 표시합니다. 실제로는 let·const 변수도 선언문보다 먼저 만들어지지만 초기화되지 않은 상태로 있으며(호이스팅, TDZ), 이는 별도 개념에서 다룹니다. 함수 선언으로 만들어지는 변수와 함수 객체도 표시하지 않습니다.',
    '함수 호출 중의 매개변수는 ‘change(o, x) 호출’ 영역으로 묶어 표시합니다. 명세의 실행 컨텍스트와 환경 레코드를 단순화한 것입니다. 함수를 호출할 때 함께 만들어지는 arguments 객체도 표시하지 않습니다.',
    '코드에서 더 이상 접근할 수 없게 된 객체는 흐리게 표시만 합니다. 그 객체가 언제 메모리에서 정리되는지(가비지 컬렉션)는 명세가 정하지 않으며, 이 페이지에서 다루지 않습니다.',
    '객체 열에는 이 코드가 만든 객체만 표시합니다. 코드 실행 전부터 있는 내장 객체(전역 객체, console 등)는 표시하지 않습니다.',
  ],
  references: [
    {
      label: 'ECMAScript 명세 — primitive value',
      url: 'https://tc39.es/ecma262/#sec-primitive-value',
    },
    {
      label: 'ECMAScript 명세 — ECMAScript Language Types',
      url: 'https://tc39.es/ecma262/#sec-ecmascript-language-types',
    },
    {
      label: 'ECMAScript 명세 — The Object Type',
      url: 'https://tc39.es/ecma262/#sec-object-type',
    },
    {
      label: 'ECMAScript 명세 — Assignment Operators: Runtime Semantics: Evaluation',
      url: 'https://tc39.es/ecma262/#sec-assignment-operators-runtime-semantics-evaluation',
    },
    {
      label: 'ECMAScript 명세 — IsStrictlyEqual (===)',
      url: 'https://tc39.es/ecma262/#sec-isstrictlyequal',
    },
    {
      label: 'ECMAScript 명세 — Let and Const Declarations',
      url: 'https://tc39.es/ecma262/#sec-let-and-const-declarations',
    },
    {
      label: 'MDN — 원시 값',
      url: 'https://developer.mozilla.org/ko/docs/Glossary/Primitive',
    },
    {
      label: 'MDN — const',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Statements/const',
    },
  ],
  reviewedAt: null,
} satisfies ConceptMeta
