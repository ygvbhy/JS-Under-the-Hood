import type { ConceptMeta } from '~/lib/concepts'

export const concept = {
  slug: 'script-async-defer',
  title: 'script의 async와 defer: 늦게 받은 defer 스크립트는 왜 순서를 지킬까',
  summary:
    '보통 script는 HTML 파싱을 멈추고, defer는 파싱이 끝난 뒤 문서 순서대로, async는 받는 대로 실행됩니다. 스크립트 응답을 일부러 늦춰 실행 순서와 DOMContentLoaded·load와의 선후를 Chromium과 HTML 표준으로 확인합니다.',
  category: 'browser',
  order: 340,
  tags: [
    'script',
    'async',
    'defer',
    'DOMContentLoaded',
    'load',
    'readyState',
    'HTML 파싱',
    '브라우저 렌더링',
    '스크립트 로딩',
  ],
  goals: [
    '보통 외부 script가 HTML 파싱을 멈추고, 실행 시점에 파서가 만든 DOM까지만 볼 수 있는 이유를 설명할 수 있다.',
    'defer 스크립트가 늦게 받아도 문서 순서대로, 파싱이 끝난 뒤 DOMContentLoaded 전에 실행되는 이유를 표준의 단계로 설명할 수 있다.',
    'async 스크립트가 받는 대로 실행되어 문서 순서와 달라질 수 있고, DOMContentLoaded를 붙잡지 않지만 load보다는 먼저 실행되는 이유를 설명할 수 있다.',
    '인라인 script의 defer, async와 defer를 함께 쓴 경우, 동적으로 만든 script, innerHTML로 넣은 script가 각각 어떻게 동작하는지 예측할 수 있다.',
  ],
  prerequisites: [{ label: 'HTML 문서의 기본 구조' }],
  related: ['global-object'],
  examples: [
    {
      id: 'parser-blocking',
      file: 'parser-blocking.html',
      runtime: 'browser',
      resources: [
        { path: '/head.js', file: 'head.js' },
        { path: '/middle.js', file: 'middle.js', delayMs: 300 },
      ],
      expectedOutput: ['head.js true', 'middle.js 1', 'inline 2'],
    },
    {
      id: 'defer-order',
      file: 'defer-order.html',
      runtime: 'browser',
      resources: [
        { path: '/first.js', file: 'first.js', delayMs: 300 },
        { path: '/second.js', file: 'second.js' },
      ],
      expectedOutput: [
        'inline loading',
        'first.js interactive 1',
        'second.js interactive',
        'DOMContentLoaded',
        'load',
      ],
    },
    {
      id: 'async-order',
      file: 'async-order.html',
      runtime: 'browser',
      resources: [
        { path: '/slow.js', file: 'slow.js', delayMs: 400 },
        { path: '/fast.js', file: 'fast.js', delayMs: 100 },
      ],
      expectedOutput: ['DOMContentLoaded', 'fast.js', 'slow.js', 'load'],
    },
    {
      id: 'inline-defer',
      file: 'inline-defer.html',
      runtime: 'browser',
      expectedOutput: ['inline defer loading 0', 'DOMContentLoaded'],
    },
    {
      id: 'async-and-defer',
      file: 'async-and-defer.html',
      runtime: 'browser',
      resources: [
        { path: '/both.js', file: 'both.js', delayMs: 300 },
        { path: '/defer-only.js', file: 'defer-only.js' },
      ],
      expectedOutput: ['defer-only.js', 'both.js'],
    },
    {
      id: 'dynamic-async',
      file: 'dynamic-async.js',
      runtime: 'browser',
      resources: [
        { path: '/slow.js', file: 'slow.js', delayMs: 300 },
        { path: '/fast.js', file: 'fast.js' },
      ],
      expectedOutput: ['true true', 'fast.js', 'slow.js'],
    },
    {
      id: 'dynamic-in-order',
      file: 'dynamic-in-order.js',
      runtime: 'browser',
      resources: [
        { path: '/slow.js', file: 'slow.js', delayMs: 300 },
        { path: '/fast.js', file: 'fast.js' },
      ],
      expectedOutput: ['false false', 'slow.js', 'fast.js'],
    },
    {
      id: 'dynamic-defer',
      file: 'dynamic-defer.js',
      runtime: 'browser',
      resources: [
        { path: '/slow.js', file: 'slow.js', delayMs: 300 },
        { path: '/fast.js', file: 'fast.js' },
      ],
      expectedOutput: ['true true true true', 'fast.js', 'slow.js'],
    },
    {
      id: 'inner-html',
      file: 'inner-html.js',
      runtime: 'browser',
      expectedOutput: ['1', 'createElement', 'end'],
    },
  ],
  simplifications: [
    '예제의 실행 결과는 Chromium에서 실행한 값입니다. 순서 주장은 WHATWG HTML 표준의 처리 단계(prepare the script element, the end)를 근거로 하며, 표준이 정하지 않은 동작은 브라우저마다 다를 수 있습니다.',
    '예제의 스크립트 응답 시간은 테스트가 정한 지연(delayMs)으로, 페이지에는 보이지 않는 조건입니다. 지연 때문에 정해진 순서(async 스크립트끼리의 순서, async와 DOMContentLoaded의 선후 등)는 표준이 보장하는 순서가 아니며, 본문에서 그렇게 구분해 씁니다.',
    'CSSOM, 렌더 트리, 레이아웃, 페인트, 리플로우는 이름만 언급하고 다루지 않습니다. HTML 파서가 위에서부터 읽어 DOM을 만든다는 데까지만 설명합니다.',
    'querySelectorAll, getElementById, createElement, append, innerHTML, textContent는 DOM API, addEventListener는 이벤트 API이며, 이 페이지에서는 설명하지 않고 결과를 보이는 도구로만 씁니다.',
    'type="module" 스크립트는 이 페이지에서 다루지 않고 ES 모듈 개념에서 다룹니다.',
    '파서가 멈춘 동안 브라우저가 뒤쪽 리소스를 미리 받는 추측 파싱(speculative parsing)과, 스타일 시트가 script 실행을 막는 조건은 다루지 않습니다.',
    'innerHTML로 넣은 script는 실행되지 않는다고 설명하지만, Trusted Types 기본 정책이 실행을 허용하는 예외는 다루지 않습니다.',
    '예제의 console은 ECMAScript 언어가 아니라 호스트가 제공하는 API입니다.',
  ],
  references: [
    {
      label: 'WHATWG HTML — script 요소의 async 속성',
      url: 'https://html.spec.whatwg.org/multipage/scripting.html#attr-script-async',
    },
    {
      label: 'WHATWG HTML — script 요소의 defer 속성',
      url: 'https://html.spec.whatwg.org/multipage/scripting.html#attr-script-defer',
    },
    {
      label: 'WHATWG HTML — Prepare the script element',
      url: 'https://html.spec.whatwg.org/multipage/scripting.html#prepare-the-script-element',
    },
    {
      label: 'WHATWG HTML — script.async IDL 속성',
      url: 'https://html.spec.whatwg.org/multipage/scripting.html#dom-script-async',
    },
    {
      label: 'WHATWG HTML — 파싱의 끝(the end)',
      url: 'https://html.spec.whatwg.org/multipage/parsing.html#the-end',
    },
    {
      label: 'WHATWG HTML — Document의 readiness (current document readiness)',
      url: 'https://html.spec.whatwg.org/multipage/dom.html#current-document-readiness',
    },
    {
      label: 'WHATWG HTML — Updating the image data (이미지는 load 이벤트를 늦춘다)',
      url: 'https://html.spec.whatwg.org/multipage/images.html#updating-the-image-data',
    },
    {
      label: 'MDN — <script> 요소',
      url: 'https://developer.mozilla.org/ko/docs/Web/HTML/Reference/Elements/script',
    },
    {
      label: 'MDN — DOMContentLoaded 이벤트',
      url: 'https://developer.mozilla.org/ko/docs/Web/API/Document/DOMContentLoaded_event',
    },
    {
      label: 'MDN — Document.readyState',
      url: 'https://developer.mozilla.org/ko/docs/Web/API/Document/readyState',
    },
  ],
  reviewedAt: '2026-11-03',
} satisfies ConceptMeta
