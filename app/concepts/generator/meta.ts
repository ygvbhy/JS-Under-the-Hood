import type { ConceptMeta } from '~/lib/concepts'

export const concept = {
  slug: 'generator',
  title: '제너레이터: 함수를 불렀는데 본문은 왜 실행되지 않을까',
  summary:
    '제너레이터 함수를 불러도 본문이 실행되지 않고 객체만 받는 이유, next와 yield가 값을 주고받는 방식, return·throw와 finally, 이터러블 만들기를 ECMAScript 명세와 실행으로 확인합니다.',
  category: 'execution',
  order: 450,
  tags: [
    '제너레이터',
    'generator',
    'function*',
    'yield',
    'yield*',
    'next',
    'return',
    'throw',
    '이터레이터',
    '이터러블',
    '제너레이터 객체',
    '실행 컨텍스트',
    'suspended-start',
    'completed',
  ],
  goals: [
    '제너레이터 함수를 부르면 본문 문장은 실행하지 않고 FunctionDeclarationInstantiation(매개변수와 var 변수 준비)까지만 한 뒤 suspended-start 상태의 제너레이터 객체를 돌려받으며, 본문은 첫 next를 부를 때 시작하고 끝까지 next하지 않으면 뒷부분이 실행되지 않는 이유를 실행 결과로 설명할 수 있다.',
    'next(x)의 인수가 멈춰 있던 yield 식의 값이 되고 첫 next의 인수는 쓰이지 않는 이유, 그리고 return 값이 done: true 결과로 나오며 for...of와 스프레드가 그 값을 버리고 completed 뒤의 next가 undefined와 true를 돌려주는 이유를 설명할 수 있다.',
    '제너레이터로 이터러블을 만들 수 있고, 제너레이터 객체가 자기 자신을 돌려주는 이터레이터라서 한 번 소비하면 다시 돌 수 없는 이유를 설명할 수 있다.',
    'return()과 throw()가 멈춰 있던 yield 지점에서 재개되고, 그 yield가 finally가 있는 try 블록 안에 있으면 return()으로 빠져나갈 때 finally 블록이 실행된 뒤 인수와 true가 돌아오며(finally 블록 안에서 다시 yield하거나 return하지 않는 경우), 시작 전(suspended-start)이나 이미 completed인 제너레이터의 return(v)는 본문을 실행하지 않고 v와 true를 돌려주고 throw(e)는 e를 던지며, for...of에서 break로 나가도 finally가 실행되는 이유를 설명할 수 있다.',
    'yield*가 안쪽 이터러블의 값을 위임해 내보내고 안쪽 제너레이터의 return 값이 yield* 식의 값이 되는 것을 실행 결과로 설명할 수 있다.',
    '제너레이터 함수는 생성자가 아니라 new로 부르면 TypeError가 나고, 실행 중(executing)인 제너레이터 객체에 next를 부르면(return()·throw()도 같은 검사를 거친다) TypeError이며, 매개변수 기본값은 제너레이터 함수를 부르는 때 평가된다는 것을 설명할 수 있다.',
  ],
  prerequisites: [
    { label: '실행 컨텍스트', slug: 'execution-context' },
    { label: '이터러블과 for...of', slug: 'iterable-for-of' },
  ],
  related: [
    'iterable-for-of',
    'execution-context',
    'spread-destructuring',
    'new-operator',
    'async-generator',
  ],
  examples: [
    {
      id: 'lazy',
      file: 'lazy.js',
      runtime: 'ecmascript',
      expectedOutput: ['제너레이터 객체를 받음', '본문 시작', '1 false'],
    },
    {
      id: 'next-arg',
      file: 'next-arg.js',
      runtime: 'ecmascript',
      expectedOutput: [
        'first false',
        'a = hi',
        'second false',
        'b = bye',
        'end true',
        'undefined true',
      ],
    },
    {
      id: 'return-value',
      file: 'return-value.js',
      runtime: 'ecmascript',
      expectedOutput: ['[1,2]', '[1,2]', '3 true'],
    },
    {
      id: 'iterable',
      file: 'iterable.js',
      runtime: 'ecmascript',
      expectedOutput: ['[1,2,3]', '[1,2,3]', 'true', '[1,2,3]', '[]'],
    },
    {
      id: 'return-finally',
      file: 'return-finally.js',
      runtime: 'ecmascript',
      expectedOutput: [
        'step 1 false',
        '정리',
        '중단 true',
        'undefined true',
        '시작 전 true',
        '또 true',
      ],
    },
    {
      id: 'throw-catch',
      file: 'throw-catch.js',
      runtime: 'ecmascript',
      expectedOutput: [
        'ready false',
        '잡음: boom',
        'recovered false',
        'done true',
        '바깥에서 잡음: 또',
      ],
    },
    {
      id: 'break-finally',
      file: 'break-finally.js',
      runtime: 'ecmascript',
      expectedOutput: ['1', '2', '3', 'finally', '루프 뒤'],
    },
    {
      id: 'delegate',
      file: 'delegate.js',
      runtime: 'ecmascript',
      expectedOutput: ['yield* 식의 값: inner의 반환값', '["o1","i1","i2","o2"]'],
    },
    {
      id: 'not-constructor',
      file: 'not-constructor.js',
      runtime: 'ecmascript',
      expectedOutput: ['new: TypeError', '실행 중 next: TypeError'],
    },
    {
      id: 'default-param',
      file: 'default-param.js',
      runtime: 'ecmascript',
      expectedOutput: ['기본값 평가', '제너레이터 객체를 받음', '본문 시작', '1 false'],
    },
  ],
  simplifications: [
    '시뮬레이터는 실행 컨텍스트를 이름으로만 그리고, 내장 next·return 메서드의 실행 컨텍스트는 그리지 않습니다.',
    '제너레이터 상태 칸은 명세의 [[GeneratorState]]를 그대로 이름으로 보이고, 제너레이터 객체가 기억하는 변수는 그 실행 컨텍스트의 환경을 요약해 보인 것입니다.',
    'try...catch...finally 문 자체와 예외는 try/catch/finally 개념에서 다룹니다. 이 페이지는 제너레이터를 빠져나갈 때 finally 블록이 실행된다는 결과만 다룹니다.',
    'async 제너레이터와 for await...of는 async 제너레이터 개념에서 다루고, 제너레이터로 비동기 흐름 다루기는 이 사이트에서 다루지 않습니다. async/await는 async/await 개념에서 다룹니다.',
    'GeneratorFunction 생성자와 Iterator helpers는 다루지 않습니다.',
    '시작 전에 부른 throw()와, 본문이 잡지 못한 예외가 throw()를 부른 쪽으로 나가며 제너레이터가 completed가 되는 경우, throw()로 재개된 예외가 finally 블록을 지나가는 경우, 실행 중인 제너레이터에 부른 return()·throw()의 TypeError는 명세 서술로만 설명하고 예제로 실행해 보이지 않습니다.',
    'finally 블록 안에서 다시 yield하거나 return하는 경우는 다루지 않습니다. 이때는 return()의 결과가 인수와 true가 아닐 수 있고 제너레이터가 completed가 되지 않을 수도 있습니다.',
    'yield*는 바깥 next의 인수를 안쪽 next에 넘기고, return()·throw()는 안쪽 이터레이터에 그 메서드가 있으면 전달합니다(없을 때의 동작도 다루지 않습니다). 이 페이지는 yield*가 안쪽 값을 내보내고 안쪽의 return 값을 식의 값으로 쓰는 동작만 예제로 다룹니다.',
    '제너레이터 함수를 부르는 동안 그 함수의 실행 컨텍스트가 스택에 올랐다가 빠지는 과정은 시뮬레이터에서 한 단계로 합쳐 그립니다. 빠진 컨텍스트는 제너레이터가 기억해 두고 next가 다시 스택에 올립니다.',
    'completed가 된 뒤에도 시뮬레이터는 제너레이터가 기억하던 변수의 마지막 값을 그대로 보입니다. 명세상 completed가 된 제너레이터의 실행 상태는 버려도 됩니다.',
    '명세 링크는 현재 초안을 가리키고, 인용은 ES2026판과 현재 초안에 똑같이 있는 문장만 씁니다. 두 판은 GeneratorResume 등의 서술 방식과 매개변수 이름이 다르지만 이 페이지가 다루는 결과는 같습니다.',
    '예제 결과는 Node.js의 vm에서 실행한 값이며, console은 ECMAScript 언어가 아니라 호스트가 제공하는 API입니다.',
  ],
  references: [
    {
      label: 'ECMAScript — Generator Function Definitions',
      url: 'https://tc39.es/ecma262/#sec-generator-function-definitions',
    },
    {
      label: 'ECMAScript — EvaluateGeneratorBody',
      url: 'https://tc39.es/ecma262/#sec-runtime-semantics-evaluategeneratorbody',
    },
    {
      label: 'ECMAScript — Generator Objects',
      url: 'https://tc39.es/ecma262/#sec-generator-objects',
    },
    {
      label: 'ECMAScript — Properties of Generator Instances',
      url: 'https://tc39.es/ecma262/#sec-properties-of-generator-instances',
    },
    {
      label: 'ECMAScript — GeneratorStart',
      url: 'https://tc39.es/ecma262/#sec-generatorstart',
    },
    {
      label: 'ECMAScript — GeneratorValidate',
      url: 'https://tc39.es/ecma262/#sec-generatorvalidate',
    },
    {
      label: 'ECMAScript — GeneratorResume',
      url: 'https://tc39.es/ecma262/#sec-generatorresume',
    },
    {
      label: 'ECMAScript — GeneratorResumeAbrupt',
      url: 'https://tc39.es/ecma262/#sec-generatorresumeabrupt',
    },
    {
      label: 'ECMAScript — GeneratorYield',
      url: 'https://tc39.es/ecma262/#sec-generatoryield',
    },
    {
      label: 'ECMAScript — Generator.prototype.next',
      url: 'https://tc39.es/ecma262/#sec-generator.prototype.next',
    },
    {
      label: 'ECMAScript — Generator.prototype.return',
      url: 'https://tc39.es/ecma262/#sec-generator.prototype.return',
    },
    {
      label: 'ECMAScript — Generator.prototype.throw',
      url: 'https://tc39.es/ecma262/#sec-generator.prototype.throw',
    },
    {
      label: 'ECMAScript — Generator Function Definitions: Runtime Semantics: Evaluation',
      url: 'https://tc39.es/ecma262/#sec-generator-function-definitions-runtime-semantics-evaluation',
    },
    {
      label: 'ECMAScript — IteratorClose',
      url: 'https://tc39.es/ecma262/#sec-iteratorclose',
    },
    {
      label: 'ECMAScript — %Iterator.prototype%[%Symbol.iterator%]',
      url: 'https://tc39.es/ecma262/#sec-iterator.prototype-%symbol.iterator%',
    },
    {
      label: 'MDN — Generator',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/Generator',
    },
    {
      label: 'MDN — function*',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Statements/function*',
    },
    {
      label: 'MDN — yield',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Operators/yield',
    },
    {
      label: 'MDN — yield*',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Operators/yield*',
    },
  ],
  reviewedAt: '2026-11-05',
} satisfies ConceptMeta
