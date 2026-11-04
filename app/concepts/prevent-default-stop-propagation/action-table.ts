// 본문 "호출별 비교표"의 데이터. content.mdx와 concept.test.ts가 함께 쓴다(본문 표와 검증이 어긋나지 않게).
// 칸의 글자는 손으로 쓰지 않고 불리언 결과에서 만든다. 출력 줄(evidenceLine)은 actions 예제의 expectedOutput과 정확히 같아야 하고,
// expectedOutput 자체는 tests/examples.test.ts가 실제 Chromium에서 실행해 대조한다.
export const ACTION_EXAMPLE_ID = 'actions'

export type ActionRow = {
  /** actions.html의 trial 이름 = 출력 줄의 첫 부분 */
  name: string
  /** 본문 표의 호출 코드(없으면 null) */
  call: string | null
  /** 호출 코드 아래에 붙는 설명(어디서 부르는지) */
  where?: string
  /** 클릭 뒤 체크 여부(기본 동작이 일어났나) */
  checked: boolean
  /** 같은 노드·같은 단계(같은 방문)의 다음 리스너가 불렸나 */
  rest: boolean
  /** 부모 리스너가 불렸나 */
  parent: boolean
  defaultPrevented: boolean
  /** 근거가 된 표준 규칙 */
  rule: string
}

export const rows: ActionRow[] = [
  {
    name: '아무것도 안 함',
    call: null,
    where: '아무것도 하지 않는 리스너',
    checked: true,
    rest: true,
    parent: true,
    defaultPrevented: false,
    rule: '플래그를 세우지 않으므로 기본 동작과 전파가 모두 그대로',
  },
  {
    name: 'preventDefault',
    call: 'e.preventDefault()',
    checked: false,
    rest: true,
    parent: true,
    defaultPrevented: true,
    rule: 'canceled flag를 세운다 — 전파 플래그는 그대로',
  },
  {
    name: 'stopPropagation',
    call: 'e.stopPropagation()',
    checked: true,
    rest: true,
    parent: false,
    defaultPrevented: false,
    rule: 'stop propagation flag를 세운다 — 같은 방문의 남은 리스너는 그대로, 다음 방문부터 부르지 않는다',
  },
  {
    name: 'stopImmediatePropagation',
    call: 'e.stopImmediatePropagation()',
    checked: true,
    rest: false,
    parent: false,
    defaultPrevented: false,
    rule: 'stop propagation flag와 stop immediate propagation flag를 함께 세운다',
  },
  {
    name: 'passive에서 preventDefault',
    call: 'e.preventDefault()',
    where: 'passive 리스너에서',
    checked: true,
    rest: true,
    parent: true,
    defaultPrevented: false,
    rule: 'passive 리스너가 도는 동안 in passive listener flag가 서 있어 canceled flag를 세우지 않는다',
  },
  {
    name: 'onclick의 return false',
    call: 'return false',
    where: 'onclick 핸들러에서',
    checked: false,
    rest: true,
    parent: true,
    defaultPrevented: true,
    rule: '이벤트 핸들러의 반환값이 false이면 canceled flag를 세운다 — 전파는 막지 않는다',
  },
  {
    name: 'addEventListener의 return false',
    call: 'return false',
    where: 'addEventListener 리스너에서',
    checked: true,
    rest: true,
    parent: true,
    defaultPrevented: false,
    rule: '이벤트 리스너의 반환값은 DOM이 사용하지 않는다',
  },
]

export const defaultText = (r: ActionRow): string => (r.checked ? '일어남' : '취소됨')
export const calledText = (called: boolean): string => (called ? '불림' : '불리지 않음')

export function evidenceLine(r: ActionRow): string {
  return `${r.name} 체크 ${r.checked} 남은 ${r.rest} 부모 ${r.parent} defaultPrevented ${r.defaultPrevented}`
}
