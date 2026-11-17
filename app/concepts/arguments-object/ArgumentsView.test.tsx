import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ArgumentsView } from './ArgumentsView'
import { scenarios } from './scenarios'

function stepOf(id: string, title: string) {
  const step = scenarios.find((s) => s.id === id)!.steps.find((s) => s.title === title)
  if (!step) throw new Error(`단계 없음: ${id} / ${title}`)
  return step.state
}

function renderStep(id: string, title: string) {
  return render(<ArgumentsView state={stepOf(id, title)} />)
}

const paramsArea = () => screen.getByRole('region', { name: '매개변수 바인딩' })
const argsArea = () => screen.getByRole('region', { name: 'arguments 객체' })

describe('ArgumentsView', () => {
  it('실행 전에는 매개변수도 arguments 객체도 없다고 보여 준다', () => {
    renderStep('two-way', '실행 전')
    expect(paramsArea()).toHaveTextContent('매개변수 없음(함수 호출 중이 아님)')
    expect(argsArea()).toHaveTextContent('arguments 객체 없음(함수 호출 중이 아님)')
    expect(screen.queryByText('바뀜')).not.toBeInTheDocument()
  })

  it('연결된 프로퍼티는 "a와 연결" 텍스트와 값을 보여 준다', () => {
    renderStep('two-way', 'a = 2')
    expect(within(paramsArea()).getByText('= 2')).toBeInTheDocument()
    const row = argsArea().querySelector<HTMLElement>('[data-arg-key="0"]')!
    expect(row).toHaveTextContent('arguments[0]')
    expect(row).toHaveTextContent('= 2')
    expect(within(row).getByText('a와 연결')).toBeInTheDocument()
    expect(argsArea()).toHaveTextContent('칸의 값은 그 프로퍼티를 읽었을 때 나오는 값입니다.')
  })

  it('바뀐 항목은 색과 함께 "바뀜" 텍스트로 보인다', () => {
    renderStep('two-way', 'arguments[0] = 9')
    expect(screen.getAllByText('바뀜')).toHaveLength(2)
    expect(document.querySelector('[data-param-name="a"]')).toHaveAttribute('data-changed', 'true')
    expect(document.querySelector('[data-arg-key="0"]')).toHaveAttribute('data-changed', 'true')
  })

  it('읽기만 하는 단계에서는 바뀜이 없다', () => {
    renderStep('two-way', 'arguments[0]을 읽어 fromParam에 저장')
    expect(screen.queryByText('바뀜')).not.toBeInTheDocument()
  })

  it('delete 직후에는 인덱스 프로퍼티가 없다', () => {
    renderStep('unlink', 'delete arguments[0]')
    expect(argsArea()).toHaveTextContent('인덱스 프로퍼티 없음')
    expect(screen.queryByText('a와 연결')).not.toBeInTheDocument()
  })

  it('다시 쓴 프로퍼티는 "연결 없음" 텍스트로 보인다', () => {
    renderStep('unlink', 'arguments[0] = 9')
    const row = argsArea().querySelector<HTMLElement>('[data-arg-key="0"]')!
    expect(within(row).getByText('연결 없음')).toBeInTheDocument()
    expect(row).toHaveTextContent('= 9')
    expect(within(paramsArea()).getByText('= 2')).toBeInTheDocument()
  })

  it('writable: false로 바꾼 뒤에는 연결 없음이고 매개변수만 따로 바뀐다', () => {
    renderStep('unlink', 'a = 3')
    const row = argsArea().querySelector<HTMLElement>('[data-arg-key="0"]')!
    expect(within(row).getByText('연결 없음')).toBeInTheDocument()
    expect(row).toHaveTextContent('= 2')
    expect(within(paramsArea()).getByText('= 3')).toBeInTheDocument()
  })
})
