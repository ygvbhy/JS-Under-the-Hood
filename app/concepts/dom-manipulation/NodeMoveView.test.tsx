import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { NodeMoveView } from './NodeMoveView'
import { scenarios } from './scenarios'

function stepIndex(id: string, title: string): number {
  const index = scenarios.find((s) => s.id === id)!.steps.findIndex((s) => s.title === title)
  if (index < 0) throw new Error(`단계 없음: ${id} / ${title}`)
  return index
}

function renderStep(id: string, title: string) {
  const steps = scenarios.find((s) => s.id === id)!.steps
  const index = stepIndex(id, title)
  return render(
    <NodeMoveView
      state={steps[index].state}
      prevState={index > 0 ? steps[index - 1].state : undefined}
    />,
  )
}

const treeArea = () => screen.getByRole('region', { name: '문서의 노드 트리' })
const detachedArea = () => screen.getByRole('region', { name: '문서에서 떨어진 노드' })

describe('NodeMoveView', () => {
  it('실행 전에는 ul의 자식 하나를 보여 주고 떨어진 노드와 바뀜 표시가 없다', () => {
    renderStep('inner-html-replace', '실행 전')
    expect(treeArea().querySelector('[data-node-id="list"]')).toHaveTextContent('문서에 연결됨')
    expect(treeArea().querySelector('[data-node-id="n1"]')).toHaveTextContent('li#first "A"')
    expect(detachedArea()).toHaveTextContent('없음')
    expect(screen.queryByText('바뀜')).not.toBeInTheDocument()
  })

  it('first를 얻은 단계에서는 변수 이름이 노드 옆에 글자로 보인다', () => {
    renderStep('inner-html-replace', 'first를 얻음')
    expect(treeArea().querySelector('[data-node-id="list"]')).toHaveTextContent('변수 list')
    expect(treeArea().querySelector('[data-node-id="n1"]')).toHaveTextContent('변수 first')
  })

  it('자식을 제거한 단계에서는 first의 노드가 떨어진 노드 영역으로 가고 "문서에서 떨어짐"이 글자로 보인다', () => {
    renderStep('inner-html-replace', 'list.innerHTML += ...: ② 자식을 모두 제거한다')
    expect(treeArea()).toHaveTextContent('자식 없음')
    expect(treeArea().querySelector('[data-node-id="n1"]')).toBeNull()
    const row = detachedArea().querySelector('[data-node-id="n1"]')!
    expect(row).toHaveTextContent('li#first "A"')
    expect(row).toHaveTextContent('변수 first')
    expect(within(detachedArea()).getByText('문서에서 떨어짐')).toBeInTheDocument()
    expect(row).toHaveAttribute('data-changed', 'true')
  })

  it('새 노드를 넣은 단계에서는 id 어트리뷰트가 같아도 다른 노드 id(n2)로 그려지고 n1은 계속 떨어져 있다', () => {
    renderStep('inner-html-replace', 'list.innerHTML += ...: ③ 파싱한 새 노드 두 개를 넣는다')
    const rows = treeArea().querySelectorAll('[data-node-id]')
    expect([...rows].map((r) => r.getAttribute('data-node-id'))).toEqual(['list', 'n2', 'n3'])
    expect(treeArea().querySelector('[data-node-id="n2"]')).toHaveTextContent('li#first "A"')
    expect(treeArea().querySelector('[data-node-id="n2"]')).toHaveAttribute('data-changed', 'true')
    expect(detachedArea().querySelector('[data-node-id="n1"]')).not.toBeNull()
    // 이미 떨어져 있던 n1은 이 단계에서 바뀌지 않았다
    expect(detachedArea().querySelector('[data-node-id="n1"]')).not.toHaveAttribute('data-changed')
  })

  it('appendChild 단계에서는 a가 todo에서 빠지고 done에 들어간 것이 바뀜으로 보인다', () => {
    renderStep('move', 'done.appendChild(a)')
    const todo = treeArea().querySelectorAll('[data-node-id]')
    expect([...todo].map((r) => r.getAttribute('data-node-id'))).toEqual(['todo', 'b', 'done', 'a'])
    expect(treeArea().querySelector('[data-node-id="a"]')).toHaveAttribute('data-changed', 'true')
    expect(treeArea().querySelector('[data-node-id="a"]')).toHaveTextContent('변수 a, returned')
    expect(detachedArea()).toHaveTextContent('없음')
  })

  it('createElement 단계에서는 새 노드 c가 떨어진 노드로 보인다', () => {
    renderStep('move', "c = document.createElement('li')")
    expect(detachedArea().querySelector('[data-node-id="c"]')).toHaveTextContent('변수 c')
    expect(within(detachedArea()).getByText('문서에서 떨어짐')).toBeInTheDocument()
  })

  it('c를 todo에 넣으면 떨어진 노드가 없어지고 c가 트리에 바뀜으로 보인다', () => {
    renderStep('move', 'todo.appendChild(c)')
    expect(detachedArea()).toHaveTextContent('없음')
    expect(treeArea().querySelector('[data-node-id="c"]')).toHaveAttribute('data-changed', 'true')
  })

  it('insertBefore 단계에서는 todo의 자식 순서가 c, b로 바뀐다', () => {
    renderStep('move', 'todo.insertBefore(c, b)')
    const ids = [...treeArea().querySelectorAll('[data-node-id]')].map((r) =>
      r.getAttribute('data-node-id'),
    )
    expect(ids).toEqual(['todo', 'c', 'b', 'done', 'a'])
    expect(treeArea().querySelector('[data-node-id="c"]')).toHaveAttribute('data-changed', 'true')
  })
})
