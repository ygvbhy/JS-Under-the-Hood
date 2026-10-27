import type { ConceptMeta } from '~/lib/concepts'

export const concept = {
  slug: 'increment-decrement',
  title: '증감 연산자: x++와 ++x는 어떤 값이 되나',
  summary:
    'x++와 ++x는 둘 다 변수의 값을 1 늘리지만 식의 값이 다릅니다. 후위는 늘리기 전 값, 전위는 늘린 뒤 값이 됩니다. 대입 식도 값을 가지며, 값이 바뀌는 시점을 알면 x = x++의 결과를 설명할 수 있습니다.',
  category: 'fundamentals',
  tags: [
    '증감 연산자',
    '증가 연산자',
    '감소 연산자',
    '후위 증가',
    '전위 증가',
    '++',
    '--',
    'x++',
    '++x',
    '부수 효과',
    'side effect',
    '대입 연산자',
    '할당 연산자',
    '복합 대입',
    '+=',
    '평가 순서',
    'UpdateExpression',
    'ToNumeric',
  ],
  goals: [
    'x++와 ++x가 변수에 남기는 값은 같고 식의 값(옛 값/새 값)만 다르다는 것을 설명할 수 있다.',
    '증감 연산자가 식을 평가하는 그 순간 변수의 값을 바꾼다는 것으로 i++ + i와 x = x++의 결과를 예측할 수 있다.',
    '대입 식과 복합 대입 식이 값을 가진다는 것을 알고 연쇄 대입의 결과를 예측할 수 있다.',
    '문자열 변수에 ++를 쓰면 숫자로 바꾼 값으로 계산하고 옛 값도 숫자가 된다는 것을 설명할 수 있다.',
  ],
  prerequisites: [
    { label: '표현식과 문' },
    { label: '연산자' },
    { label: '암묵적 타입 변환', slug: 'type-coercion' },
    { label: '원시 값과 객체', slug: 'primitives-and-objects' },
  ],
  related: ['type-coercion', 'primitives-and-objects'],
  examples: [
    {
      id: 'postfix-prefix',
      file: 'postfix-prefix.js',
      runtime: 'ecmascript',
      expectedOutput: ['2 1 2 2'],
    },
    { id: 'statement', file: 'statement.js', runtime: 'ecmascript', expectedOutput: ['6'] },
    {
      id: 'string-operand',
      file: 'string-operand.js',
      runtime: 'ecmascript',
      expectedOutput: ['number 5 number 6'],
    },
    {
      id: 'assignment-value',
      file: 'assignment-value.js',
      runtime: 'ecmascript',
      expectedOutput: ['3 7 7', '15 15'],
    },
    { id: 'self-assign', file: 'self-assign.js', runtime: 'ecmascript', expectedOutput: ['1'] },
    {
      id: 'operand-order',
      file: 'operand-order.js',
      runtime: 'ecmascript',
      expectedOutput: ['3 2'],
    },
  ],
  simplifications: [
    '시뮬레이터는 식을 평가하는 동안 일어나는 일을 "읽기"(명세의 GetValue), "쓰기"(PutValue), "식의 값"으로만 보여 줍니다. 명세는 먼저 피연산자나 대입의 왼쪽을 평가해 값을 넣을 대상(Reference Record)을 정하는데, 이 단계는 따로 표시하지 않고 설명 문장으로만 다룹니다.',
    '명세의 증감 연산자는 읽은 값을 먼저 ToNumeric으로 숫자로 바꿉니다. 시뮬레이터 시나리오의 값은 모두 숫자라 이 단계에서 값이 그대로이므로 표시하지 않습니다. 문자열의 경우는 예제로 다룹니다.',
    '선언문의 초기화(const b = a++)는 명세상 대입(PutValue)이 아니라 바인딩 초기화이므로 "쓰기"로 표시하지 않고, 변수가 새로 생기는 것으로 표시합니다.',
    '"읽기", "쓰기", "식의 값", "옛 값", "새 값"은 교육용 이름입니다(옛 값·새 값은 명세 알고리즘의 oldValue·newValue). "부수 효과"는 명세 용어가 아니라 식이 값을 만드는 것 말고 변수 등 상태를 바꾸는 일을 가리키는 일반 용어입니다.',
    'BigInt의 증감(BigInt::add), 객체 프로퍼티의 증감, 함수 호출 식에 증감을 쓸 때 SyntaxError가 아니라 실행 중 ReferenceError가 나는 예외(명세의 web-compat)는 다루지 않습니다.',
    '복합 대입 연산자는 +=만, 대입은 변수에 하는 것만 다룹니다. 다른 복합 대입·논리 대입(&&= 등)·구조 분해 할당은 다루지 않습니다.',
    '변수는 선언문이 실행된 뒤에만 표시합니다(호이스팅·TDZ는 별도 개념에서 다룹니다). 이 코드가 선언한 변수만 표시합니다.',
    'console.log는 호스트 API입니다. 예제의 typeof 결과(number)는 문자열이며 따옴표 없이 출력됩니다.',
  ],
  references: [
    {
      label: 'ECMAScript 명세 — Update Expressions',
      url: 'https://tc39.es/ecma262/#sec-update-expressions',
    },
    {
      label: 'ECMAScript 명세 — Update Expressions: Static Semantics: Early Errors',
      url: 'https://tc39.es/ecma262/#sec-update-expressions-static-semantics-early-errors',
    },
    {
      label: 'ECMAScript 명세 — Postfix Increment Operator: Runtime Semantics: Evaluation',
      url: 'https://tc39.es/ecma262/#sec-postfix-increment-operator-runtime-semantics-evaluation',
    },
    {
      label: 'ECMAScript 명세 — Prefix Increment Operator: Runtime Semantics: Evaluation',
      url: 'https://tc39.es/ecma262/#sec-prefix-increment-operator-runtime-semantics-evaluation',
    },
    {
      label: 'ECMAScript 명세 — Assignment Operators: Runtime Semantics: Evaluation',
      url: 'https://tc39.es/ecma262/#sec-assignment-operators-runtime-semantics-evaluation',
    },
    {
      label: 'ECMAScript 명세 — EvaluateStringOrNumericBinaryExpression',
      url: 'https://tc39.es/ecma262/#sec-evaluatestringornumericbinaryexpression',
    },
    {
      label: 'ECMAScript 명세 — ToNumeric',
      url: 'https://tc39.es/ecma262/#sec-tonumeric',
    },
    {
      label: 'MDN — 증가 연산자 (++)',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Operators/Increment',
    },
    {
      label: 'MDN — 감소 연산자 (--)',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Operators/Decrement',
    },
    {
      label: 'MDN — 할당 연산자 (=)',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Operators/Assignment',
    },
    {
      label: 'MDN — 더하기 할당 (+=)',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Operators/Addition_assignment',
    },
    {
      label: 'MDN — 표현식과 연산자',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Guide/Expressions_and_operators',
    },
  ],
  reviewedAt: null,
} satisfies ConceptMeta
