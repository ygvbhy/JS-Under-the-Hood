import type { ConceptMeta } from '~/lib/concepts'

export const concept = {
  slug: 'regexp-lastindex',
  title: '정규 표현식의 g 플래그: test 결과는 왜 번갈아 바뀔까',
  summary:
    'g나 y 플래그가 있는 정규 표현식은 test와 exec를 부를 때마다 lastIndex 프로퍼티를 읽고 바꿉니다. 같은 호출도 앞선 호출에 따라 결과가 달라지고 filter 콜백에서는 함정이 됩니다.',
  category: 'objects',
  order: 280,
  tags: [
    '정규 표현식',
    'RegExp',
    'lastIndex',
    'g 플래그',
    'global',
    'test',
    'exec',
    'match',
    'sticky',
    'y 플래그',
    '빈 매치',
  ],
  goals: [
    'g 플래그가 있는 정규 표현식에 test와 exec를 부르면 lastIndex부터 검색하고, 성공하면 매치 끝으로 옮기고 실패하면 0으로 되돌리는 규칙으로 결과가 번갈아 바뀌는 이유를 설명할 수 있다.',
    'exec 반복문이 끝나는 이유를 lastIndex가 매치 끝으로 옮겨 가는 규칙으로, filter 콜백에서 g 플래그가 만드는 함정을 lastIndex가 문자열이 아니라 정규 표현식 객체의 프로퍼티라는 점으로 설명할 수 있다.',
    'g 플래그가 없을 때 lastIndex를 무시하고 바꾸지 않는 것, match의 g 유무에 따른 결과 차이, 정규 표현식 리터럴이 평가할 때마다 새 객체를 만드는 것을 예측할 수 있다.',
    '빈 문자열 매치에서 exec 반복이 제자리에 머무는 이유와 y(sticky) 플래그가 lastIndex 위치에서만 매치를 시도하는 동작을 설명할 수 있다.',
  ],
  prerequisites: [
    { label: '프로퍼티 어트리뷰트와 접근자', slug: 'property-attributes' },
    { label: '원시 값과 객체', slug: 'primitives-and-objects' },
    { label: '화살표 함수와 메서드 축약', slug: 'arrow-functions' },
  ],
  related: [
    'property-attributes',
    'primitives-and-objects',
    'primitive-methods',
    'array-method-pitfalls',
    'arrow-functions',
  ],
  examples: [
    {
      id: 'test-alternates',
      file: 'test-alternates.js',
      runtime: 'ecmascript',
      expectedOutput: ['true 1', 'false 0', 'true 1'],
    },
    {
      id: 'exec-loop',
      file: 'exec-loop.js',
      runtime: 'ecmascript',
      expectedOutput: ['at 1 3', 'at 5 7', '0'],
    },
    {
      id: 'non-global',
      file: 'non-global.js',
      runtime: 'ecmascript',
      expectedOutput: ['true 3', '1 3'],
    },
    {
      id: 'match-global',
      file: 'match-global.js',
      runtime: 'ecmascript',
      expectedOutput: ['["an","an"] undefined 0', '["an"] 1', 'null'],
    },
    {
      id: 'filter-trap',
      file: 'filter-trap.js',
      runtime: 'ecmascript',
      expectedOutput: ['["apple","apricot"] 1', '["apple","avocado","apricot"]'],
    },
    {
      id: 'literal-new-object',
      file: 'literal-new-object.js',
      runtime: 'ecmascript',
      expectedOutput: ['true true true', 'true false true', 'false'],
    },
    {
      id: 'empty-match',
      file: 'empty-match.js',
      runtime: 'ecmascript',
      expectedOutput: ['"" 0 0', '"" 0 0', '["","","",""]', '4 0'],
    },
    {
      id: 'sticky',
      file: 'sticky.js',
      runtime: 'ecmascript',
      expectedOutput: ['false 0', 'true 2', 'false 0', 'true 2'],
    },
  ],
  simplifications: [
    '정규 표현식 패턴 문법과 i·m·s·u·v·d 플래그는 다루지 않습니다. 예제의 ^는 문자열의 시작을 뜻하는 것으로만 씁니다. u·v 플래그에서 한 칸이 코드 포인트가 되는 점은 예제 7의 반복문 주의로만 언급합니다.',
    'replace·split·search와 match가 심벌 메서드를 거쳐 정규 표현식 쪽 검색을 부르는 방식은 별도 개념이라 다루지 않습니다. matchAll(ES2020)은 이터레이터를 쓰는 별도 개념이라, 정규 표현식을 복제해 써서 원래 객체의 lastIndex를 바꾸지 않지만 복제본은 원래 lastIndex 값에서 찾기 시작한다는 점, 빈 문자열에 매치해도 다음 위치로 나아간다는 점, g 플래그가 없으면 TypeError라는 점만 언급합니다.',
    'y(sticky) 플래그는 『모던 자바스크립트 Deep Dive』 31장 밖의 ES2015 플래그이며, 이 페이지는 학습 편의를 위해 함께 다룹니다.',
    '시뮬레이터는 매칭 과정(백트래킹)을 그리지 않고, 검색 한 번의 시작 위치·매치 범위·lastIndex 변화만 그립니다.',
    '글자 칸은 UTF-16 코드 유닛 단위이며, 예제는 ASCII 문자만 씁니다.',
    'exec·test를 덮어쓰거나 RegExp의 하위 클래스를 만드는 경우는 다루지 않습니다.',
    '예제의 console은 ECMAScript 언어가 아니라 호스트가 제공하는 API입니다.',
  ],
  references: [
    {
      label: 'ECMAScript 명세 — RegExpBuiltinExec',
      url: 'https://tc39.es/ecma262/#sec-regexpbuiltinexec',
    },
    {
      label: 'ECMAScript 명세 — RegExp.prototype.test',
      url: 'https://tc39.es/ecma262/#sec-regexp.prototype.test',
    },
    {
      label: 'ECMAScript 명세 — RegExp.prototype.exec',
      url: 'https://tc39.es/ecma262/#sec-regexp.prototype.exec',
    },
    {
      label: 'ECMAScript 명세 — RegExpExec',
      url: 'https://tc39.es/ecma262/#sec-regexpexec',
    },
    {
      label: 'ECMAScript 명세 — RegExp.prototype [ %Symbol.match% ]',
      url: 'https://tc39.es/ecma262/#sec-regexp.prototype-%25symbol.match%25',
    },
    {
      label: 'ECMAScript 명세 — String.prototype.match',
      url: 'https://tc39.es/ecma262/#sec-string.prototype.match',
    },
    {
      label: 'ECMAScript 명세 — 정규 표현식 리터럴의 평가',
      url: 'https://tc39.es/ecma262/#sec-regular-expression-literals-runtime-semantics-evaluation',
    },
    {
      label: 'ECMAScript 명세 — Properties of RegExp Instances (lastIndex)',
      url: 'https://tc39.es/ecma262/#sec-properties-of-regexp-instances',
    },
    {
      label: 'MDN — RegExp.prototype.test()',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/RegExp/test',
    },
    {
      label: 'MDN — RegExp.prototype.global',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/RegExp/global',
    },
    {
      label: 'MDN — String.prototype.match()',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/String/match',
    },
    {
      label: 'MDN — RegExp: lastIndex (영문)',
      url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/lastIndex',
    },
    {
      label: 'MDN — RegExp.prototype.exec() (영문)',
      url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/exec',
    },
    {
      label: 'MDN — RegExp.prototype.sticky (영문)',
      url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/sticky',
    },
  ],
  reviewedAt: '2026-11-02',
} satisfies ConceptMeta
