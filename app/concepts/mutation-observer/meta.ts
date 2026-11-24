import type { ConceptMeta } from '~/lib/concepts'

const DOM = 'https://dom.spec.whatwg.org/#'

export const concept = {
  slug: 'mutation-observer',
  title: 'MutationObserver: 세 번 바꿨는데 콜백은 왜 한 번만 불릴까',
  summary:
    '동기 코드에서 DOM을 세 번 바꾸면 MutationObserver 콜백은 레코드 3개를 담아 한 번 불립니다. 알림 마이크로태스크가 큐에 들어가는 때가 정하는 순서, takeRecords·disconnect, 관찰 옵션, 여러 관찰자와 콜백 안의 변경을 확인합니다.',
  category: 'async',
  order: 444,
  tags: [
    'MutationObserver',
    'MutationRecord',
    'takeRecords',
    'disconnect',
    '마이크로태스크',
    'DOM 변경 감지',
  ],
  goals: [
    '동기 코드에서 여러 번 바꾼 변경이 레코드 여러 개를 담은 콜백 한 번으로 전달되는 이유를 DOM 표준의 레코드 큐와 mutation observer microtask queued 플래그로 설명할 수 있다.',
    '콜백이 then보다 먼저인지 나중인지는 우선순위가 아니라, 직전 알림이 시작된 뒤 어느 관찰자에게든 첫 레코드가 생겨 알림 마이크로태스크가 큐에 들어간 때로 정해진다는 것을 예제로 설명할 수 있다.',
    'takeRecords와 disconnect가 레코드 큐를 비우고, 알릴 레코드가 없는 관찰자의 콜백은 불리지 않는다는 것을 설명할 수 있다.',
    'childList·attributes·subtree 옵션에 따라 어떤 변경이 레코드가 되는지와 옵션 규칙(childList·attributes·characterData 중 true가 하나도 없으면 TypeError, attributes가 없을 때 attributeOldValue가 있으면 attributes를 켬)을 예측할 수 있다.',
    '관찰자 여럿이 알림 마이크로태스크 하나에서 생성 순서대로 불리고 콜백 예외는 보고된 뒤 다음 관찰자가 불린다는 것, 관찰자가 하나일 때 콜백 안의 변경은 새 알림 마이크로태스크로 큐 뒤에 들어간다는 것을 설명할 수 있다.',
  ],
  prerequisites: [
    { label: '마이크로태스크 큐', slug: 'microtask-queue' },
    { label: 'DOM 조작', slug: 'dom-manipulation' },
    { label: 'HTML 어트리뷰트와 DOM 프로퍼티', slug: 'html-attribute-dom-property' },
    { label: '이벤트 루프와 태스크 큐', slug: 'event-loop' },
  ],
  related: ['promise', 'timers', 'uncaught-exceptions', 'dom-tree-nodes'],
  examples: [
    {
      id: 'batch',
      file: 'batch.html',
      runtime: 'browser',
      expectedOutput: ['동기 코드 끝 4', '콜백 1 레코드 3'],
    },
    {
      id: 'order',
      file: 'order.html',
      runtime: 'browser',
      expectedOutput: [
        '스크립트 1 끝',
        '콜백 레코드 2',
        'then 1',
        '스크립트 2 끝',
        'then 2',
        '콜백 레코드 2',
      ],
    },
    {
      id: 'take-records',
      file: 'take-records.html',
      runtime: 'browser',
      expectedOutput: ['꺼낸 레코드 2', '동기 코드 끝', '콜백 레코드 1 data-c'],
    },
    {
      id: 'no-callback',
      file: 'no-callback.html',
      runtime: 'browser',
      expectedOutput: ['first에서 꺼낸 레코드 1', 'second에 남은 레코드 0', '동기 코드 끝', 'then'],
    },
    {
      id: 'options',
      file: 'options.html',
      runtime: 'browser',
      expectedOutput: [
        'childList만 1 childList:list',
        'subtree까지 4 attributes:list attributes:item childList:item childList:list',
      ],
    },
    {
      id: 'option-rules',
      file: 'option-rules.html',
      runtime: 'browser',
      expectedOutput: [
        '빈 옵션 TypeError',
        'attributes false와 attributeOldValue TypeError',
        '레코드 3 [null,"1","2"]',
      ],
    },
    {
      id: 'two-observers',
      file: 'two-observers.html',
      runtime: 'browser',
      expectedOutput: ['동기 코드 끝', 'A 콜백 1', 'error 이벤트 TypeError', 'B 콜백 1', 'then'],
    },
    {
      id: 'mutate-in-callback',
      file: 'mutate-in-callback.html',
      runtime: 'browser',
      expectedOutput: ['콜백 1 레코드 1', 'then', '콜백 2 레코드 1', '콜백이 넣은 then'],
    },
  ],
  simplifications: [
    '예제 출력은 Chromium에서 실행한 값이고 다른 브라우저는 확인하지 않았습니다. MutationObserver와 console.log는 ECMAScript가 아니라 호스트(DOM 표준과 브라우저)의 API입니다.',
    '표준은 알림 플래그와 대기 중인 관찰자 목록을 similar-origin window agent마다 하나씩 둡니다. 이 페이지는 그것을 "페이지 하나"로 단순화해 설명합니다.',
    '레코드 없이 알림 마이크로태스크를 큐에 넣는 경로(subtree로 관찰하던 노드를 제거하거나 옮길 때의 임시 등록 관찰자, slot 변경 신호)와 slotchange 이벤트는 다루지 않습니다.',
    'characterData, characterDataOldValue, attributeFilter, attributeNamespace 옵션은 다루지 않습니다.',
    '예제 4에서 알림 마이크로태스크 자체는 실행되지만 비어 있는 레코드 목록으로는 콜백을 부르지 않는다는 것은 표준의 서술이며 출력으로는 관찰할 수 없습니다.',
    '관찰자가 여럿일 때 앞 관찰자의 콜백이 만든 레코드는, 알림이 시작될 때 정해 둔 목록에 들어 있고 아직 차례가 오지 않은 관찰자라면 같은 알림에서 받고, 이미 차례가 지났거나(변경을 일으킨 관찰자 자신 포함) 그 목록에 없던 관찰자라면 새 알림 마이크로태스크에서 받는다는 것이 표준의 서술입니다. 이 페이지의 예제는 콜백 안 변경을 관찰자가 하나인 경우만 보입니다.',
    '예제 7의 전역 error 이벤트와 preventDefault는 잡히지 않은 예외 개념에서 다룹니다. 이 사이트의 실행기가 취소되지 않은 예외를 실패로 처리하므로 예제가 preventDefault를 부릅니다.',
    '알림 단계는 현재 판 DOM 표준(대기 중인 관찰자를 생성 번호로 정렬해 부르는 방식)으로 설명합니다. 2023년 6월부터 2026년 6월까지의 Review Draft는 대기 목록에 들어간 순서(이번 알림에서 레코드를 먼저 받은 순서)로 불렀고, 그 판대로라면 예제 7은 B가 먼저입니다. 그 판들은 관심 있는 관찰자가 없는 변경에도 알림 마이크로태스크를 큐에 넣었지만, 현재 판은 관심 있는 관찰자가 없으면 넣지 않습니다. 그보다 앞선 판은 생성된 관찰자 전체를 생성 순서로 돌았습니다. 예제의 Chromium 출력은 현재 판과 같습니다.',
    '렌더링과의 시점, 성능, 폐기된 Mutation Events는 다루지 않습니다.',
  ],
  references: [
    { label: 'WHATWG DOM — Mutation observers', url: `${DOM}mutation-observers` },
    {
      label: 'WHATWG DOM — Queue a mutation observer microtask',
      url: `${DOM}queue-a-mutation-observer-compound-microtask`,
    },
    {
      label: 'WHATWG DOM — Notify mutation observers',
      url: `${DOM}notify-mutation-observers`,
    },
    { label: 'WHATWG DOM — Queue a mutation record', url: `${DOM}queue-a-mutation-record` },
    {
      label: 'WHATWG DOM — MutationObserver의 observe()',
      url: `${DOM}dom-mutationobserver-observe`,
    },
    {
      label: 'WHATWG DOM — MutationObserver의 takeRecords()',
      url: `${DOM}dom-mutationobserver-takerecords`,
    },
    {
      label: 'WHATWG DOM — MutationObserver의 disconnect()',
      url: `${DOM}dom-mutationobserver-disconnect`,
    },
    {
      label: 'WHATWG DOM — Change an attribute',
      url: `${DOM}concept-element-attributes-change`,
    },
    {
      label: 'WHATWG HTML — Perform a microtask checkpoint',
      url: 'https://html.spec.whatwg.org/multipage/webappapis.html#perform-a-microtask-checkpoint',
    },
    {
      label: 'Web IDL — Invoke a callback function',
      url: 'https://webidl.spec.whatwg.org/#invoke-a-callback-function',
    },
    {
      label: 'MDN — MutationObserver',
      url: 'https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver',
    },
    {
      label: 'MDN — MutationRecord',
      url: 'https://developer.mozilla.org/en-US/docs/Web/API/MutationRecord',
    },
  ],
  reviewedAt: '2026-11-24',
} satisfies ConceptMeta
