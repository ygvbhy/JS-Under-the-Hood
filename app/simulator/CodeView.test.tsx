import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CodeView } from './CodeView'

const code = 'let a = 1\nlet b = a\nb = 2\n'

function rows(container: HTMLElement) {
  return Array.from(container.querySelectorAll('code > span'))
}

describe('CodeView', () => {
  it('줄 수만큼 행을 그린다(끝의 개행 하나는 제거)', () => {
    const { container } = render(<CodeView code={code} />)
    expect(rows(container)).toHaveLength(3)
    expect(rows(container)[1]).toHaveTextContent('2let b = a')
  })

  it('끝 개행이 없어도 같은 줄 수를 그린다', () => {
    const { container } = render(<CodeView code={code.trimEnd()} />)
    expect(rows(container)).toHaveLength(3)
  })

  it('line 범위의 행에만 aria-current="step"이 붙는다', () => {
    const { container } = render(<CodeView code={code} line={{ from: 2, to: 3 }} />)
    const current = rows(container).map((r) => r.getAttribute('aria-current'))
    expect(current).toEqual([null, 'step', 'step'])
  })

  it('line이 없으면 강조하지 않는다', () => {
    const { container } = render(<CodeView code={code} />)
    expect(container.querySelectorAll('[aria-current]')).toHaveLength(0)
  })

  it('줄 번호는 접근성 트리에서 숨긴다', () => {
    const { container } = render(<CodeView code={code} />)
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(3)
  })

  it('label이 있으면 이름 붙은 region이 된다', () => {
    render(<CodeView code={code} label="예제 코드" />)
    expect(screen.getByRole('region', { name: '예제 코드' })).toBeInTheDocument()
  })
})
