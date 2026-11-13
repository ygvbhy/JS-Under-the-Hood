import type { ConceptMeta } from '~/lib/concepts'

export const concept = {
  slug: 'string-replace-split',
  title: '문자열 replace와 split: 왜 첫 번째만 바뀔까',
  summary:
    'replace에 문자열을 주면 첫 번째만 바뀌고 정규식 기호도 글자 그대로입니다. 모두 바꾸려면 replaceAll이나 g 정규식을 씁니다. 치환 문자열의 $ 패턴, split의 빈 조각과 캡처 끼어들기도 다룹니다.',
  category: 'fundamentals',
  order: 295,
  tags: [
    'replace',
    'replaceAll',
    'split',
    '정규 표현식',
    '치환 패턴',
    '캡처 그룹',
    'lastIndex',
    'matchAll',
    '문자열 메서드',
    '문자열 치환',
  ],
  goals: [
    "'a-b-c'.replace('-', '+')처럼 문자열 패턴을 줄 때와 정규식(g·y 플래그)을 줄 때 어디까지 바뀌는지 예측할 수 있다.",
    '치환 문자열의 $ 패턴($1, $&, $<name> 등)이 어떻게 해석되는지, 해당 그룹이 없으면 글자 그대로 남는 경우를 설명할 수 있다.',
    '치환 함수가 받는 인수의 순서와, g 정규식에서 함수가 불리는 시점을 설명할 수 있다.',
    'replaceAll이 TypeError를 던지는 조건과, split의 캡처 그룹·limit·빈 문자열 결과를 예측할 수 있다.',
  ],
  prerequisites: [
    { label: '원시 값의 메서드', slug: 'primitive-methods' },
    { label: '정규 표현식의 g 플래그', slug: 'regexp-lastindex' },
    { label: '문자열 길이와 UTF-16', slug: 'string-utf16' },
  ],
  related: ['regexp-lastindex', 'string-utf16', 'iterable-for-of', 'error-handling'],
  examples: [
    {
      id: 'first-only',
      file: 'first-only.js',
      runtime: 'ecmascript',
      expectedOutput: ['a+b-c', 'a+b+c', 'a+b+c', 'a!b.c', '!.b.c'],
    },
    {
      id: 'substitution',
      file: 'substitution.js',
      runtime: 'ecmascript',
      expectedOutput: ['13/11/2026', '11.2026', 'a[a|c]c', '[]b', '[$<x>]b', '[$0|a|a0]'],
    },
    {
      id: 'function-replacer',
      file: 'function-replacer.js',
      runtime: 'ecmascript',
      expectedOutput: ['x#y#', '["1:1:1:x1y22","22:22:3:x1y22"]', '$&b', '7b'],
    },
    {
      id: 'global-lastindex',
      file: 'global-lastindex.js',
      runtime: 'ecmascript',
      expectedOutput: ['bbb', '0', 'baa', '2'],
    },
    {
      id: 'replaceall-error',
      file: 'replaceall-error.js',
      runtime: 'ecmascript',
      expectedOutput: ['TypeError', 'bb', 'ba', '-abc', '-a-b-c-'],
    },
    {
      id: 'split-basics',
      file: 'split-basics.js',
      runtime: 'ecmascript',
      expectedOutput: ['["a","b","","c"]', '["a","b"]', '[]', '["a,b,,c"]', '[""]', '[]'],
    },
    {
      id: 'split-regex',
      file: 'split-regex.js',
      runtime: 'ecmascript',
      expectedOutput: ['["a","1","b","2","c"]', '3', '["a","b","c"]', '["a","1"]'],
    },
  ],
  simplifications: [
    '문자열도 정규식도 아닌 첫 인수와 함수가 아닌 치환값은 문자열로 바뀐 뒤 같은 규칙을 따릅니다. 치환값을 생략하면 문자열 undefined가 들어갑니다. 단, split의 구분자가 undefined이면 생략한 것과 같아서, 문자열 undefined로 자르지 않고 원래 문자열 하나만 든 배열을 돌려줍니다. 이 페이지의 설명은 첫 인수가 문자열이나 정규식인 경우만 다룹니다.',
    '정규 표현식의 패턴 문법(\\d, [0-9], 그룹 문법 등)은 다루지 않습니다. 예제의 패턴은 결과를 확인하는 용도입니다.',
    'replace·replaceAll·split이 Symbol.replace·Symbol.split 메서드를 가진 객체(정규식 등)에 일을 넘기는 방식과, 인수가 정규식인지 판정하는 IsRegExp가 먼저 Symbol.match를 확인한다는 점은 별도 개념이라 다루지 않습니다. 본문은 그 결과로 정해지는 정규식의 동작만 설명합니다.',
    'matchAll은 g가 없는 정규식이면 TypeError라는 점과 문자열 인수를 g 정규식으로 바꾼다는 점만 언급하고, 나머지는 별도 개념입니다. 그 결과인 이터레이터는 이터러블과 for...of 개념에서 다룹니다.',
    'u·v 플래그와 빈 매치에서 위치를 한 칸 넘기는 규칙은 다루지 않습니다.',
    'split이 내부에서 y 플래그 정규식을 새로 만드는 방식은 다루지 않습니다.',
    'exec를 덮어쓴 정규식이나 RegExp를 상속한 객체는 다루지 않습니다.',
    'search와 match는 다루지 않습니다.',
    'limit에 음수·소수·2^32 이상의 값을 넘길 때 ToUint32로 바뀌는 규칙은 다루지 않습니다.',
    'replaceAll은 ES2021, 이름 있는 그룹은 ES2018에 추가된 기능입니다.',
    '예제의 try…catch는 오류를 보이려는 용도이며 try/catch/finally 개념에서 다룹니다.',
    '예제의 console은 ECMAScript 언어가 아니라 호스트가 제공하는 API입니다.',
  ],
  references: [
    {
      label: 'ECMAScript 명세 — String.prototype.replace',
      url: 'https://tc39.es/ecma262/#sec-string.prototype.replace',
    },
    {
      label: 'ECMAScript 명세 — String.prototype.replaceAll',
      url: 'https://tc39.es/ecma262/#sec-string.prototype.replaceall',
    },
    {
      label: 'ECMAScript 명세 — GetSubstitution',
      url: 'https://tc39.es/ecma262/#sec-getsubstitution',
    },
    {
      label: 'ECMAScript 명세 — String.prototype.split',
      url: 'https://tc39.es/ecma262/#sec-string.prototype.split',
    },
    {
      label: 'ECMAScript 명세 — RegExp.prototype[%Symbol.replace%]',
      url: 'https://tc39.es/ecma262/#sec-regexp.prototype-%25symbol.replace%25',
    },
    {
      label: 'ECMAScript 명세 — RegExp.prototype[%Symbol.split%]',
      url: 'https://tc39.es/ecma262/#sec-regexp.prototype-%25symbol.split%25',
    },
    {
      label: 'MDN — String.prototype.replace()',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/String/replace',
    },
    {
      label: 'MDN — String.prototype.replaceAll()',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/String/replaceAll',
    },
    {
      label: 'MDN — String.prototype.split()',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/String/split',
    },
  ],
  reviewedAt: '2026-11-13',
} satisfies ConceptMeta
