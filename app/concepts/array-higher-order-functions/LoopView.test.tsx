import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LoopView } from './LoopView'
import { scenarios } from './scenarios'

function steps(id: string) {
  return scenarios.find((s) => s.id === id)!.steps
}

function renderStep(id: string, title: string) {
  const all = steps(id)
  const i = all.findIndex((s) => s.title === title)
  if (i < 0) throw new Error(`단계 없음: ${id} / ${title}`)
  return render(<LoopView state={all[i].state} prevState={i > 0 ? all[i - 1].state : undefined} />)
}

const row = (name: string) => document.querySelector<HTMLElement>(`[data-row="${name}"]`)!
const cell = (i: number) => document.querySelector<HTMLElement>(`[data-cell="${i}"]`)!

describe('LoopView', () => {
  it('실행 전에는 배열도 진행 중인 메서드도 없다고 글자로 알려 준다', () => {
    renderStep('push-during-foreach', '실행 전')
    expect(screen.getByText('아직 만든 배열이 없습니다.')).toBeInTheDocument()
    expect(screen.getByText('이 단계에서 진행 중인 콜백 메서드 없음')).toBeInTheDocument()
    expect(row('fixed-length')).toHaveTextContent('아직 읽지 않음')
    expect(row('current-length')).toHaveTextContent('배열 없음')
    expect(row('outcome')).toHaveTextContent('아직 끝나지 않음')
  })

  it('고정한 길이와 배열의 지금 length를 따로 보여 준다', () => {
    renderStep('push-during-foreach', '인덱스 1: 콜백 실행')
    expect(row('fixed-length')).toHaveTextContent('시작 때 읽은 길이(고정)')
    expect(row('fixed-length')).toHaveTextContent('2')
    expect(row('current-length')).toHaveTextContent('배열의 지금 length')
    expect(row('current-length')).toHaveTextContent('4')
    expect(cell(2)).toHaveTextContent('방문 범위 밖')
    expect(cell(3)).toHaveTextContent('방문 범위 밖')
    expect(cell(1)).not.toHaveTextContent('방문 범위 밖')
  })

  it('지금 보는 인덱스는 색뿐 아니라 글자로도 표시한다', () => {
    renderStep('push-during-foreach', '인덱스 1: 확인하고 읽기')
    expect(cell(1)).toHaveAttribute('data-current', 'true')
    expect(cell(1)).toHaveTextContent('(지금 k)')
    expect(cell(0)).not.toHaveAttribute('data-current')
  })

  it('프로퍼티가 있으면 "HasProperty → true"와 읽은 값이 보인다', () => {
    renderStep('push-during-foreach', '인덱스 0: 확인하고 읽기')
    expect(row('check')).toHaveTextContent('HasProperty → true')
    expect(row('read')).toHaveTextContent('1')
  })

  it('프로퍼티가 없으면 "콜백 안 부름"과 "읽지 않음"이 보이고 값은 length 밖 칸이다', () => {
    renderStep('remove-during-foreach', 'a 인덱스 2: 프로퍼티가 없어 콜백을 부르지 않는다')
    expect(row('check')).toHaveTextContent('HasProperty → false → 콜백 안 부름')
    expect(row('read')).toHaveTextContent('읽지 않음')
    expect(cell(2)).toHaveAttribute('data-kind', 'beyond-length')
    expect(cell(2)).toHaveTextContent('length 밖')
    expect(row('callback')).toHaveTextContent('없음')
  })

  it('find는 확인하지 않고 Get하며 콜백 반환 판정이 보인다', () => {
    renderStep('find-reads-missing-index', 'a 인덱스 0: 콜백 실행')
    expect(row('check')).toHaveTextContent('find는 확인하지 않고 Get')
    expect(row('returned')).toHaveTextContent('undefined → false → 계속')
  })

  it('forEach 단계에는 콜백 반환 판정 행이 없다', () => {
    renderStep('push-during-foreach', '인덱스 0: 콜백 실행')
    expect(document.querySelector('[data-row="returned"]')).toBeNull()
  })

  it("구멍 칸은 '구멍', length 밖 칸은 'length 밖'으로 서로 다르게 보이고 같은 설명이 붙는다", () => {
    renderStep('find-reads-missing-index', 'a 인덱스 1: 확인 없이 읽기 (구멍)')
    expect(cell(1)).toHaveAttribute('data-kind', 'hole')
    expect(cell(1)).toHaveTextContent('구멍')
    expect(cell(1)).not.toHaveTextContent('length 밖')
    expect(row('read')).toHaveTextContent('undefined')
    expect(
      screen.getByText('구멍과 length 밖은 둘 다 프로퍼티가 없어서 HasProperty가 false입니다.'),
    ).toBeInTheDocument()
  })

  it('find는 pop으로 length 밖이 된 인덱스도 undefined로 읽는다', () => {
    renderStep('find-reads-missing-index', 'b 인덱스 2: 확인 없이 읽기 (length 밖)')
    expect(cell(2)).toHaveAttribute('data-kind', 'beyond-length')
    expect(row('check')).toHaveTextContent('find는 확인하지 않고 Get')
    expect(row('read')).toHaveTextContent('undefined')
    expect(row('current-length')).toHaveTextContent('2')
    expect(row('fixed-length')).toHaveTextContent('3')
  })

  it('끝 단계에는 끝난 이유가 보인다', () => {
    renderStep('push-during-foreach', '인덱스 2: 고정한 길이에 닿아 끝')
    expect(row('outcome')).toHaveTextContent('고정한 길이 2에 닿아 끝')
  })

  it('이전 단계와 같은 행은 "바뀜"이 없고 바뀐 행에만 붙는다', () => {
    renderStep('push-during-foreach', '인덱스 0: 콜백 실행')
    expect(row('current-length')).toHaveAttribute('data-changed', 'true')
    expect(row('fixed-length')).not.toHaveAttribute('data-changed')
  })

  it('모은 값 목록이 보인다', () => {
    renderStep('push-during-foreach', '인덱스 1: 콜백 실행')
    expect(row('visited')).toHaveTextContent('콜백이 모은 값 seen')
    expect(row('visited')).toHaveTextContent('1, 2')
  })

  it('끝 단계는 그 인덱스에서 확인도 읽기도 하지 않았다고 보여 준다', () => {
    renderStep('push-during-foreach', '인덱스 2: 고정한 길이에 닿아 끝')
    expect(row('check')).toHaveTextContent('확인하지 않음(인덱스가 고정한 길이에 닿아 루프 끝)')
    expect(row('read')).toHaveTextContent('읽지 않음(루프 끝)')
    expect(row('check')).not.toHaveTextContent('아직')
  })

  it('find는 시작 단계에서도 나중에 확인한다고 보이지 않는다', () => {
    renderStep('find-reads-missing-index', 'a.find 시작: length를 한 번 읽는다')
    expect(row('check')).toHaveTextContent('find는 확인하지 않음')
    expect(row('check')).not.toHaveTextContent('아직 확인 전')
  })

  it('prevState 없이도(첫 렌더) 그려진다', () => {
    render(<LoopView state={steps('push-during-foreach')[3].state} />)
    expect(row('call')).toHaveTextContent('nums.forEach(콜백)')
  })
})
