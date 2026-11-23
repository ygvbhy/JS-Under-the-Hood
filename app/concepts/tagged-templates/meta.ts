import type { ConceptMeta } from '~/lib/concepts'

const SPEC = 'https://tc39.es/ecma262/#'

export const concept = {
  slug: 'tagged-templates',
  title: '태그드 템플릿: 같은 템플릿을 두 번 평가하면 왜 같은 배열을 받을까',
  summary:
    '태그 함수는 완성된 문자열이 아니라 글자 조각 배열과, 문자열로 바꾸지 않은 끼운 값을 받습니다. 조각 배열은 소스의 그 위치마다 하나라서 몇 번 평가해도 같은 동결 배열이고, 글자가 같아도 위치가 다르면 다른 배열입니다. raw와 String.raw도 확인합니다.',
  category: 'fundamentals',
  order: 292,
  tags: [
    '태그드 템플릿',
    'tagged template',
    '템플릿 리터럴',
    '태그 함수',
    'String.raw',
    'raw',
    'GetTemplateObject',
    '이스케이프',
  ],
  goals: [
    '태그 함수가 첫 인수로 글자 조각 배열을, 나머지 인수로 끼운 식의 값을 문자열로 바꾸지 않은 채 받고, 조각 수가 언제나 값 수보다 하나 많다는 것을 예측할 수 있다.',
    '같은 위치의 태그드 템플릿은 몇 번 평가해도, 같은 코드에서 만든 다른 함수가 평가해도 같은 조각 배열을 받는다는 것을 명세의 GetTemplateObject로 설명할 수 있다. 글자가 같아도 다른 위치이면 다른 배열을 받는다는 것도 같은 근거로 설명할 수 있다.',
    '조각 배열과 raw 배열이 동결되어 있고 raw 프로퍼티는 열거되지 않는다는 것으로 대입·Object.keys의 결과를 예측할 수 있다.',
    'cooked 문자열과 raw 문자열의 차이와 String.raw의 결과를 설명할 수 있다. 잘못된 이스케이프가 든 조각이 태그드 템플릿에서는 cooked 값이 undefined가 되고, 태그 없는 템플릿 리터럴에서는 SyntaxError가 된다는 것도 설명할 수 있다.',
  ],
  prerequisites: [
    { label: '데이터 타입', slug: 'data-types' },
    { label: '프로퍼티 어트리뷰트와 접근자', slug: 'property-attributes' },
    { label: '화살표 함수와 메서드 축약', slug: 'arrow-functions' },
  ],
  related: [
    'data-types',
    'type-coercion',
    'to-primitive',
    'property-attributes',
    'arrow-functions',
    'strict-mode',
    'closure',
    'string-utf16',
    'this-binding',
  ],
  examples: [
    {
      id: 'tag-arguments',
      file: 'tag-arguments.js',
      runtime: 'ecmascript',
      expectedOutput: [
        '["id:",", next:",""] 3 2',
        'object number',
        '2 number',
        'id:[object Object], next:8',
        'object string',
      ],
    },
    {
      id: 'strings-count',
      file: 'strings-count.js',
      runtime: 'ecmascript',
      expectedOutput: ['["plain"] 0', '["",""] 1', '["","",""] 2', '["a","b"] 1'],
    },
    {
      id: 'same-site',
      file: 'same-site.js',
      runtime: 'ecmascript',
      expectedOutput: ['true true', 'false', 'false true'],
    },
    {
      id: 'frozen-template',
      file: 'frozen-template.js',
      runtime: 'ecmascript',
      expectedOutput: ['true true true', 'TypeError', 'a 0,1'],
    },
    {
      id: 'cooked-raw',
      file: 'cooked-raw.js',
      runtime: 'ecmascript',
      expectedOutput: ['"a\\tb" 3', '"a\\\\tb" 4', '"a\\\\tb2c"', 'true', 'x1y'],
    },
    {
      id: 'invalid-escape',
      file: 'invalid-escape.js',
      runtime: 'ecmascript',
      expectedOutput: ['undefined "\\\\unicode"', 'undefined "C:\\\\xyz"', '\\unicode'],
    },
  ],
  simplifications: [
    "예제는 예제 4(첫 줄이 'use strict';)를 빼고 sloppy mode 스크립트입니다. 첫 줄에 'use strict';를 붙여도 출력이 같습니다. console은 ECMAScript가 아니라 호스트가 제공하는 API입니다. 예제의 JSON.stringify는 값을 보이는 도구로만 쓰며 JSON 개념에서 다룹니다. 예제 4의 try…catch는 오류 이름을 보이려는 용도이며 try/catch/finally 개념에서 다룹니다.",
    '"위치"는 명세의 Parse Node를 풀어 쓴 말입니다. 같은 소스 텍스트라도 eval이나 Function 생성자처럼 다시 파싱하면 다른 Parse Node가 되어 다른 템플릿 객체를 받습니다.',
    '템플릿 객체 재사용은 같은 realm 안의 이야기입니다. realm마다 [[TemplateMap]]이 따로 있으며 iframe 같은 다른 realm은 다루지 않습니다.',
    'raw 문자열도 CR·CRLF 줄바꿈은 LF로 바뀝니다. 템플릿 리터럴의 줄바꿈 처리와 따옴표 문자열과의 차이는 데이터 타입 개념에서 다룹니다. ${} 값을 문자열로 바꾸는 규칙은 암묵적 타입 변환 개념과 객체를 원시 값으로 개념에서 다룹니다.',
    '옵셔널 체이닝 뒤의 태그드 템플릿(SyntaxError)과 꼬리 호출 위치는 다루지 않습니다.',
  ],
  references: [
    { label: 'ECMAScript 명세 — Template Literals', url: `${SPEC}sec-template-literals` },
    { label: 'ECMAScript 명세 — GetTemplateObject', url: `${SPEC}sec-gettemplateobject` },
    { label: 'ECMAScript 명세 — Tagged Templates', url: `${SPEC}sec-tagged-templates` },
    { label: 'ECMAScript 명세 — TV(Static Semantics)', url: `${SPEC}sec-static-semantics-tv` },
    { label: 'ECMAScript 명세 — TRV(Static Semantics)', url: `${SPEC}sec-static-semantics-trv` },
    {
      label: 'ECMAScript 명세 — 템플릿의 조기 오류',
      url: `${SPEC}sec-static-semantics-template-early-errors`,
    },
    { label: 'ECMAScript 명세 — String.raw', url: `${SPEC}sec-string.raw` },
    {
      label: 'ECMAScript 2017 명세 — GetTemplateObject(옛 판의 규칙)',
      url: 'https://tc39.es/ecma262/2017/#sec-gettemplateobject',
    },
    {
      label: 'MDN — 템플릿 리터럴(태그드 템플릿)',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Template_literals',
    },
  ],
  reviewedAt: '2026-11-23',
} satisfies ConceptMeta
