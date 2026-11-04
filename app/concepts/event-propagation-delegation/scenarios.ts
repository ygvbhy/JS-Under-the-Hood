import type { Scenario, Step } from '~/simulator/types'
import pathButtonCode from './examples/path-button.html?raw'
import pathIconCode from './examples/path-icon.html?raw'

// 이 개념의 시각화 상태 모델. 단계마다 전체 스냅샷을 담는다(이전 단계와의 차분 아님).
// - path: composedPath() 순서(타깃 → window). 첫 출력(window 캡처 리스너) 전에는 null
// - listeners: 시나리오에 등록된 리스너(코드 순서, 시나리오마다 고정)
// - pass: 지금 순회(캡처 순회/버블 순회). 디스패치 전·후에는 null
// - node: 이번 단계에서 방문하는 노드(= currentTarget). 디스패치 전·후에는 null
// - eventPhase: Event.eventPhase 값
// - target: Event.target. 디스패치 전에는 null
// - fired: 이번 단계에서 실행된 리스너의 label. 없으면 null

export type Listener = { node: string; capture: boolean; label: string; line: number }

export type PropagationState = {
  path: string[] | null
  listeners: Listener[]
  pass: 'capture' | 'bubble' | null
  node: string | null
  eventPhase: 0 | 1 | 2 | 3
  target: string | null
  fired: string | null
}

type PStep = Step<PropagationState>

// --- 작성용 헬퍼 -------------------------------------------------------------------------------

const at = (n: number) => ({ from: n, to: n })

const WINDOW_LABEL = 'window 캡처'

type Config = {
  path: string[]
  listeners: Listener[]
  clickLine: number
  windowRange: { from: number; to: number } // window 캡처 리스너 본문 범위
}

const PASS_TEXT = { capture: '캡처 순회', bubble: '버블 순회' } as const

function buildSteps(config: Config, withEnd: boolean): PStep[] {
  const { path, listeners, clickLine, windowRange } = config
  const target = path[0]
  const forward = [...path].reverse() // window → 타깃 (캡처 순회 순서)
  const steps: PStep[] = []
  let output: string[] = []
  let currentPath: string[] | null = null

  steps.push({
    title: '실행 전',
    explanation:
      '리스너가 모두 등록되었고 아직 click()을 부르지 않았습니다. 이벤트 경로는 디스패치가 시작될 때 정해집니다.',
    line: at(clickLine),
    state: {
      path: null,
      listeners,
      pass: null,
      node: null,
      eventPhase: 0,
      target: null,
      fired: null,
    },
    output: [],
  })

  const visit = (pass: 'capture' | 'bubble', node: string) => {
    const isTarget = node === target
    const eventPhase = isTarget ? 2 : pass === 'capture' ? 1 : 3
    const listener = listeners.find((l) => l.node === node && l.capture === (pass === 'capture'))
    const isFirst = pass === 'capture' && node === 'window'
    if (isFirst) currentPath = path

    if (listener) {
      output = [
        ...output,
        listener.label === WINDOW_LABEL
          ? JSON.stringify(path)
          : `${listener.label} ${eventPhase} ${target} ${node}`,
      ]
    }

    const kind = pass === 'capture' ? '캡처' : '버블'
    const title = isTarget
      ? `타깃 도착(${PASS_TEXT[pass]}): ${node}${listener ? ` — ${listener.label} 실행` : ' (리스너 없음)'}`
      : listener
        ? `${PASS_TEXT[pass]}: ${node} — ${listener.label} 실행`
        : `${PASS_TEXT[pass]}: ${node} (리스너 없음)`

    const phaseName = ['NONE', 'CAPTURING_PHASE', 'AT_TARGET', 'BUBBLING_PHASE'][eventPhase]
    const parts: string[] = []
    if (isFirst) {
      parts.push('경로가 정해졌고 가장 바깥인 window부터 내려갑니다.')
    }
    parts.push(
      isTarget
        ? `${node}이(가) target이라 eventPhase는 ${eventPhase}(${phaseName})입니다. 타깃은 ${PASS_TEXT[pass]}에서도 방문하고, 이 순회에서는 ${pass === 'capture' ? 'capture가 true인' : 'capture가 true가 아닌'} 리스너만 부릅니다.`
        : `eventPhase는 ${eventPhase}(${phaseName})이고 currentTarget은 ${node}입니다. 이 순회에서는 ${pass === 'capture' ? 'capture가 true인' : 'capture가 true가 아닌'} 리스너만 부릅니다.`,
    )
    parts.push(
      listener
        ? isFirst
          ? `${listener.label} 리스너가 composedPath()를 출력합니다.`
          : `${node}의 ${kind} 리스너(${listener.label})가 실행되어 한 줄을 출력합니다.`
        : `${node}에는 이 순회에 맞는 리스너가 없어 아무것도 실행되지 않습니다.`,
    )

    steps.push({
      title,
      explanation: parts.join(' '),
      line: listener
        ? listener.label === WINDOW_LABEL
          ? windowRange
          : at(listener.line)
        : at(clickLine),
      state: {
        path: currentPath,
        listeners,
        pass,
        node,
        eventPhase: eventPhase as 1 | 2 | 3,
        target,
        fired: listener ? listener.label : null,
      },
      output,
    })
  }

  forward.forEach((node) => visit('capture', node))
  path.forEach((node) => visit('bubble', node))

  if (withEnd) {
    output = [...output, '끝 0 null']
    steps.push({
      title: '디스패치 끝',
      explanation:
        '디스패치가 끝나면 eventPhase는 NONE(0), currentTarget은 null로 돌아갑니다. 저장해 둔 이벤트를 읽으면 그래서 0 null이 나옵니다.',
      line: at(32),
      state: {
        path: currentPath,
        listeners,
        pass: null,
        node: null,
        eventPhase: 0,
        target,
        fired: null,
      },
      output,
    })
  }

  return steps
}

// --- 시나리오 ----------------------------------------------------------------------------------

const iconListeners: Listener[] = [
  { node: 'window', capture: true, label: 'window 캡처', line: 22 },
  { node: 'card', capture: true, label: 'card 캡처', line: 26 },
  { node: 'save', capture: true, label: 'save 캡처', line: 27 },
  { node: 'save', capture: false, label: 'save 버블', line: 28 },
  { node: 'card', capture: false, label: 'card 버블', line: 29 },
  { node: 'document', capture: false, label: 'document 버블', line: 30 },
]

const buttonListeners: Listener[] = [
  { node: 'window', capture: true, label: 'window 캡처', line: 21 },
  { node: 'save', capture: false, label: 'save 버블', line: 24 },
  { node: 'save', capture: true, label: 'save 캡처', line: 25 },
  { node: 'card', capture: false, label: 'card 버블', line: 26 },
  { node: 'card', capture: true, label: 'card 캡처', line: 27 },
]

export const scenarios: Scenario<PropagationState>[] = [
  {
    id: 'icon',
    label: '아이콘을 클릭',
    exampleId: 'path-icon',
    code: pathIconCode,
    steps: buildSteps(
      {
        path: ['icon', 'save', 'card', 'body', 'html', 'document', 'window'],
        listeners: iconListeners,
        clickLine: 31,
        windowRange: { from: 22, to: 25 },
      },
      true,
    ),
  },
  {
    id: 'button',
    label: '버튼을 직접 클릭',
    exampleId: 'path-button',
    code: pathButtonCode,
    steps: buildSteps(
      {
        path: ['save', 'card', 'body', 'html', 'document', 'window'],
        listeners: buttonListeners,
        clickLine: 28,
        windowRange: { from: 21, to: 23 },
      },
      false,
    ),
  },
]
