import type { ConceptMeta } from '~/lib/concepts'

export const concept = {
  slug: 'property-keys',
  title: "프로퍼티 키: obj[1]과 obj['1']은 왜 같은 프로퍼티인가",
  summary:
    "대괄호 안의 값은 문자열로 바뀌어 프로퍼티 키가 되므로 obj[1]과 obj['1']은 같은 프로퍼티입니다. 점 표기와 대괄호 표기의 차이, 없는 프로퍼티를 읽을 때의 결과, 객체에 프로퍼티를 추가·삭제하는 과정을 단계별로 따라갑니다.",
  category: 'fundamentals',
  tags: [
    '객체',
    '프로퍼티',
    '프로퍼티 키',
    '점 표기법',
    '대괄호 표기법',
    '계산된 프로퍼티 이름',
    'delete',
    '객체 리터럴',
  ],
  goals: [
    '대괄호 안의 값이 문자열로 바뀌어 키가 된다는 것으로 숫자·불리언·null·객체를 키로 쓴 결과를 예측할 수 있다.',
    '점 표기는 이름을 그대로 키로 쓰고 대괄호 표기는 식의 값을 키로 쓴다는 차이로 obj.key와 obj[key]를 구분할 수 있다.',
    '없는 프로퍼티를 읽을 때(undefined)와 undefined의 프로퍼티를 읽을 때(TypeError)를 구분할 수 있다.',
    '대입이 프로퍼티를 추가하거나 값을 바꾸고 delete가 프로퍼티를 지운다는 것(없는 키도 true)을 설명할 수 있다.',
  ],
  prerequisites: [
    { label: '객체 리터럴' },
    { label: '원시 값과 객체', slug: 'primitives-and-objects' },
    { label: '암묵적 타입 변환', slug: 'type-coercion' },
  ],
  related: ['short-circuit-evaluation', 'number-type'],
  examples: [
    {
      id: 'same-key',
      file: 'same-key.js',
      runtime: 'ecmascript',
      expectedOutput: ['금', '은', '동', '{"1":"동","2":"은"}'],
    },
    {
      id: 'dot-vs-bracket',
      file: 'dot-vs-bracket.js',
      runtime: 'ecmascript',
      expectedOutput: ['민지', '민지', '민지', '열쇠'],
    },
    {
      id: 'add-delete',
      file: 'add-delete.js',
      runtime: 'ecmascript',
      expectedOutput: ['undefined', '{"a":10,"b":2}', 'true', 'undefined', 'true', '{"b":2}'],
    },
    {
      id: 'computed-key',
      file: 'computed-key.js',
      runtime: 'ecmascript',
      expectedOutput: ['{"field":"빨강"}', '{"color":"빨강","size2":"M"}'],
    },
    {
      id: 'number-key',
      file: 'number-key.js',
      runtime: 'ecmascript',
      expectedOutput: [
        '하나 천',
        'undefined undefined',
        '{"1":"하나","1000":"천","0.30000000000000004":"근삿값"}',
      ],
    },
    {
      id: 'non-string-key',
      file: 'non-string-key.js',
      runtime: 'ecmascript',
      expectedOutput: [
        '참 없음',
        '빈 객체',
        '빈 객체',
        '{"true":"참","null":"없음","[object Object]":"빈 객체"}',
      ],
    },
    {
      id: 'dot-syntax',
      file: 'dot-syntax.js',
      runtime: 'ecmascript',
      expectedOutput: ['1000', 'NaN', 'A'],
    },
  ],
  simplifications: [
    '프로퍼티 키는 문자열 또는 심벌입니다. 심벌은 문자열로 바뀌지 않고 그대로 키가 되며, 이 페이지는 문자열 키만 다룹니다(심벌은 별도 개념).',
    '객체에 없는 프로퍼티를 읽으면 명세는 그 객체의 프로토타입에서 이어서 찾고, 끝까지 없을 때 undefined를 돌려줍니다. 대입도 프로토타입을 확인한 뒤 프로퍼티를 추가합니다. 이 페이지의 예제는 프로토타입에도 없는 키만 쓰며, 프로토타입은 별도 개념에서 다룹니다.',
    '시뮬레이터는 대괄호 안의 값을 키로 바꾸는 과정을 한 번에 보여 줍니다. 명세는 obj[k] = v에서 오른쪽 v를 평가한 뒤에 키로 바꿉니다.',
    '객체가 키로 쓰일 때 문자열 "[object Object]"가 되는 과정(ToPrimitive가 객체의 메서드를 호출)은 결과만 보여 줍니다(암묵적 타입 변환 페이지와 같은 범위).',
    '프로퍼티 어트리뷰트(쓰기·삭제 가능 여부 등)와 접근자 프로퍼티는 다루지 않습니다. 그래서 delete가 false를 돌려주거나 strict mode에서 TypeError가 나는 경우도 다루지 않습니다.',
    '객체 카드의 프로퍼티 순서는 실제 나열 순서(Object.keys)와 같습니다. 정수 형태 키가 먼저 나열되는 순서 규칙은 다루지 않으며, 예제는 생성 순서와 나열 순서가 같게 작성했습니다.',
    "'객체 A'는 같은 객체인지 구분하기 위한 교육용 이름이며 메모리 주소가 아닙니다. 변수는 선언문이 실행된 뒤에만 표시합니다(호이스팅·TDZ는 별도 개념).",
  ],
  references: [
    {
      label: 'ECMAScript 명세 — The Object Type',
      url: 'https://tc39.es/ecma262/#sec-object-type',
    },
    {
      label: 'ECMAScript 명세 — Property Accessors',
      url: 'https://tc39.es/ecma262/#sec-property-accessors',
    },
    {
      label: 'ECMAScript 명세 — ToPropertyKey',
      url: 'https://tc39.es/ecma262/#sec-topropertykey',
    },
    {
      label: 'ECMAScript 명세 — Object Initializer',
      url: 'https://tc39.es/ecma262/#sec-object-initializer',
    },
    {
      label: 'ECMAScript 명세 — OrdinaryGet',
      url: 'https://tc39.es/ecma262/#sec-ordinaryget',
    },
    {
      label: 'ECMAScript 명세 — OrdinarySetWithOwnDescriptor',
      url: 'https://tc39.es/ecma262/#sec-ordinarysetwithowndescriptor',
    },
    {
      label: 'ECMAScript 명세 — The delete Operator',
      url: 'https://tc39.es/ecma262/#sec-delete-operator',
    },
    {
      label: 'MDN — 프로퍼티 접근자',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Operators/Property_accessors',
    },
    {
      label: 'MDN — 객체 초기자',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Operators/Object_initializer',
    },
    {
      label: 'MDN — delete',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Operators/delete',
    },
    {
      label: 'MDN — 객체 사용하기',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Guide/Working_with_objects',
    },
  ],
  reviewedAt: '2026-10-28',
} satisfies ConceptMeta
