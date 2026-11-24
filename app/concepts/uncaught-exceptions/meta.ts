import type { ConceptMeta } from '~/lib/concepts'

const HTML = 'https://html.spec.whatwg.org/multipage/webappapis.html#'
const SPEC = 'https://tc39.es/ecma262/#'

export const concept = {
  slug: 'uncaught-exceptions',
  title: '잡히지 않은 예외: 한 스크립트에서 예외가 나도 다음 스크립트는 왜 실행될까',
  summary:
    '스크립트 요소는 하나씩 따로 실행되어, 잡히지 않은 예외는 그 스크립트만 멈추고 전역 error 이벤트로 보고된 뒤 다음 스크립트가 실행됩니다. 실행 전에 만들어진 var와 최상위 함수 선언은 남고 예외 뒤의 let은 계속 TDZ입니다. 리스너의 예외와 onerror도 확인합니다.',
  category: 'execution',
  order: 472,
  tags: [
    '잡히지 않은 예외',
    'uncaught exception',
    'error 이벤트',
    'report an exception',
    'onerror',
    '스크립트 요소',
    'ErrorEvent',
    'TDZ',
  ],
  goals: [
    '파서가 실행하는 스크립트 요소는 하나씩 따로 실행되어, 잡히지 않은 예외는 그 스크립트의 나머지 코드만 멈추고 전역 error 이벤트로 보고된 뒤 (실행 컨텍스트 스택이 비면) 마이크로태스크 체크포인트와 다음 스크립트가 이어진다는 것을 예측할 수 있다.',
    '문법 오류가 있는 스크립트는 한 줄도 실행되지 않고 선언도 만들어지지 않지만, 실행 중 예외가 난 스크립트는 본문 실행 전에 만든 var·최상위 함수 바인딩이 남고 예외 때문에 선언문까지 평가되지 않은 let·const·class 바인딩은 초기화되지 않은 채 남는다는 것을 명세의 ScriptEvaluation과 GlobalDeclarationInstantiation으로 설명할 수 있다.',
    '리스너가 던진 예외는 디스패치를 부른 코드로 전파되지 않고 보고되며 다음 리스너가 실행된다는 것을 예측할 수 있다.',
    '전역의 onerror 이벤트 핸들러는 보고된 예외의 error 이벤트에서 인수 다섯 개를 받고 true를 반환해야 이벤트가 취소된다는 것을 다른 이벤트 핸들러와 비교해 설명할 수 있다.',
  ],
  prerequisites: [
    { label: 'try/catch/finally', slug: 'error-handling' },
    { label: '호이스팅', slug: 'hoisting' },
    { label: 'TDZ', slug: 'tdz' },
    { label: '마이크로태스크 큐', slug: 'microtask-queue' },
    { label: '기본 동작과 전파 막기', slug: 'prevent-default-stop-propagation' },
  ],
  related: [
    'error-handling',
    'hoisting',
    'tdz',
    'microtask-queue',
    'prevent-default-stop-propagation',
    'event-propagation-delegation',
    'script-async-defer',
    'global-object',
    'execution-context',
    'promise',
  ],
  examples: [
    {
      id: 'script-stops',
      file: 'script-stops.html',
      runtime: 'browser',
      expectedOutput: ['1 시작', 'error 이벤트 TypeError', 'then', '2 실행'],
    },
    {
      id: 'syntax-error',
      file: 'syntax-error.html',
      runtime: 'browser',
      expectedOutput: ['error 이벤트 SyntaxError', '2 실행 undefined'],
    },
    {
      id: 'declarations-remain',
      file: 'declarations-remain.html',
      runtime: 'browser',
      expectedOutput: [
        'error 이벤트 TypeError',
        '1 undefined function',
        'late: ReferenceError',
        'error 이벤트 SyntaxError',
        '다음 스크립트 undefined',
      ],
    },
    {
      id: 'listener-throws',
      file: 'listener-throws.html',
      runtime: 'browser',
      expectedOutput: ['리스너 1', 'error 이벤트 TypeError', '리스너 2', 'click 뒤'],
    },
    {
      id: 'onerror-return',
      file: 'onerror-return.html',
      runtime: 'browser',
      expectedOutput: ['onerror 5 TypeError', '취소됨 true', 'onerror false 반환', '취소됨 false'],
    },
    {
      id: 'then-throws',
      file: 'then-throws.html',
      runtime: 'browser',
      expectedOutput: ['끝', 'then 1', 'then 2', 'unhandledrejection TypeError'],
    },
  ],
  simplifications: [
    '예제는 Chromium에서 실행한 결과이고 다른 브라우저는 확인하지 않았습니다. error 이벤트의 message·filename·lineno·colno는 브라우저마다 다를 수 있어 출력하지 않습니다.',
    '실행기는 취소되지 않은 예외를 실패로 처리하므로 모든 예제는 error 리스너에서 preventDefault()를 부릅니다. 취소하지 않았을 때 사용자 에이전트가 콘솔에 보고할 수 있다는 부분은 표준의 서술로만 쓰고 예제로 실행해 보이지 않습니다(try/catch/finally 개념과 같은 방식입니다).',
    '파서가 HTML에서 만나 실행하는 인라인 클래식 스크립트만 다룹니다. 다른 스크립트가 appendChild 등으로 넣은 인라인 스크립트는 그 자리에서 실행되어 넣은 쪽 코드가 이어지고 그 사이에는 마이크로태스크 체크포인트가 없으므로 이 페이지의 순서와 다릅니다. 외부 src 스크립트, 모듈 스크립트, 외부 스크립트의 로딩 오류(스크립트 요소의 error 이벤트), 다른 출처 스크립트의 muted errors, 워커도 다루지 않습니다.',
    '남는 바인딩은 스크립트 최상위의 선언과 함수 밖의 var 선언만 다룹니다. 블록 안 함수 선언은 sloppy mode의 웹 호환 의미론(명세 부록 B) 때문에 var 바인딩만 먼저 생기고 값은 블록 안에서 그 함수 선언에 닿을 때 들어가므로, 예외가 그 선언보다 앞이면 undefined로 남습니다. 브라우저 확장과 개발자 도구가 예외를 다루는 방식도 다루지 않습니다.',
    'error 리스너 안에서 다시 예외가 나면 report an exception의 in error reporting mode 때문에 error 이벤트가 다시 발화하지 않습니다. 실행기가 그 경우를 실패로 처리하므로 예제로 보이지 않습니다.',
    'button.click()으로 만든 이벤트는 isTrusted가 false입니다. 리스너의 예외가 보고되는 방식은 사용자의 실제 클릭에서도 같은 DOM 단계(inner invoke)이지만, 실제 클릭은 이 페이지에서 실행하지 않았습니다.',
    'img 같은 요소의 onerror는 special error event handling 대상이 아니라 이벤트 객체 하나를 받습니다(body·frameset의 onerror는 window의 onerror를 가리키므로 예외). 이 페이지는 전역(window)의 onerror만 다룹니다.',
    '명세는 GlobalDeclarationInstantiation이 선언 충돌을 바인딩을 만들기 전에 검사한다고 정하지만, Chromium에서 var나 함수 선언이 앞 스크립트의 let과 같은 이름이면 충돌보다 앞에 나온 var·함수 바인딩이 만들어진 채 SyntaxError가 나는 것을 확인했습니다. 이 페이지는 let으로 다시 선언하는 경우만 다룹니다.',
    '예제의 console.log는 호스트 API입니다. try...catch는 try/catch/finally 개념에서 다룹니다.',
  ],
  references: [
    {
      label: 'WHATWG HTML — Run a classic script',
      url: `${HTML}run-a-classic-script`,
    },
    {
      label: 'WHATWG HTML — Create a classic script',
      url: `${HTML}creating-a-classic-script`,
    },
    {
      label: 'WHATWG HTML — Clean up after running script',
      url: `${HTML}clean-up-after-running-script`,
    },
    {
      label: 'WHATWG HTML — Report an exception',
      url: `${HTML}report-an-exception`,
    },
    {
      label: 'WHATWG HTML — The event handler processing algorithm',
      url: `${HTML}the-event-handler-processing-algorithm`,
    },
    {
      label: 'WHATWG DOM — Inner invoke',
      url: 'https://dom.spec.whatwg.org/#concept-event-listener-inner-invoke',
    },
    {
      label: 'ECMAScript — ScriptEvaluation',
      url: `${SPEC}sec-runtime-semantics-scriptevaluation`,
    },
    {
      label: 'ECMAScript — GlobalDeclarationInstantiation',
      url: `${SPEC}sec-globaldeclarationinstantiation`,
    },
    {
      label: 'MDN — Window: error 이벤트',
      url: 'https://developer.mozilla.org/en-US/docs/Web/API/Window/error_event',
    },
    {
      label: 'MDN — ErrorEvent',
      url: 'https://developer.mozilla.org/en-US/docs/Web/API/ErrorEvent',
    },
  ],
  reviewedAt: '2026-11-24',
} satisfies ConceptMeta
