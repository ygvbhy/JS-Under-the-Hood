import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MemoryView } from './MemoryView'
import type { MemoryState } from './scenarios'

const num = (n: number) => ({
  kind: 'primitive' as const,
  type: 'number' as const,
  display: String(n),
})

const base: MemoryState = {
  scopes: [
    {
      id: 'top',
      label: '코드 전체',
      bindings: [
        {
          name: 'greeting',
          declaredWith: 'const',
          value: { kind: 'primitive', type: 'string', display: '안녕' },
        },
        { name: 'p', declaredWith: 'let', value: { kind: 'object', id: 'A' } },
      ],
    },
  ],
  objects: [{ id: 'A', label: '객체 A', props: [{ key: 'n', value: num(1) }] }],
}

describe('MemoryView', () => {
  it('const 표식과 큰따옴표가 붙은 문자열 값을 보여 준다', () => {
    render(<MemoryView state={base} />)
    const row = screen.getByText('greeting').closest('li')!
    expect(within(row).getByText('const')).toBeInTheDocument()
    expect(within(row).getByText('"안녕"')).toBeInTheDocument()
  })

  it('객체 참조는 "→ 객체 A" 칩으로 보이고, 객체 카드에 프로퍼티가 있다', () => {
    render(<MemoryView state={base} />)
    expect(screen.getByText('→ 객체 A')).toBeInTheDocument()
    const row = screen.getByText('n:').closest('li')!
    expect(within(row).getByText('1')).toBeInTheDocument()
  })

  it('매개변수 표식을 보여 준다', () => {
    const state: MemoryState = {
      scopes: [
        {
          id: 'call',
          label: 'f(x) 호출',
          bindings: [{ name: 'x', declaredWith: 'param', value: num(1) }],
        },
      ],
      objects: [],
    }
    render(<MemoryView state={state} />)
    expect(screen.getByText('f(x) 호출')).toBeInTheDocument()
    expect(screen.getByText('매개변수')).toBeInTheDocument()
  })

  it('이전 상태에 없던 changed 항목은 "새로 생김", 있던 항목은 "변경됨"이다', () => {
    const prev: MemoryState = {
      scopes: [
        {
          id: 'top',
          label: '코드 전체',
          bindings: [{ name: 'a', declaredWith: 'let', value: num(10) }],
        },
      ],
      objects: [{ id: 'A', label: '객체 A', props: [{ key: 'n', value: num(1) }] }],
    }
    const next: MemoryState = {
      scopes: [
        {
          id: 'top',
          label: '코드 전체',
          bindings: [
            { name: 'a', declaredWith: 'let', value: num(20), changed: true },
            { name: 'b', declaredWith: 'let', value: num(5), changed: true },
          ],
        },
      ],
      objects: [
        {
          id: 'A',
          label: '객체 A',
          props: [{ key: 'n', value: num(2), changed: true }],
          changed: true,
        },
        { id: 'B', label: '객체 B', props: [{ key: 'n', value: num(0) }], changed: true },
      ],
    }
    render(<MemoryView state={next} prevState={prev} />)
    expect(within(screen.getByText('a').closest('li')!).getByText('변경됨')).toBeInTheDocument()
    expect(within(screen.getByText('b').closest('li')!).getByText('새로 생김')).toBeInTheDocument()
    // 객체 A의 프로퍼티 n은 변경됨, 객체 B 카드는 새로 생김
    const cardA = screen.getByText('객체 A').closest('li')!
    expect(within(cardA).getByText('변경됨')).toBeInTheDocument()
    const cardB = screen.getByText('객체 B', { selector: 'p' }).closest('li')!
    expect(within(cardB).getByText('새로 생김')).toBeInTheDocument()
  })

  it('changed가 없으면 배지가 없다', () => {
    render(<MemoryView state={base} />)
    expect(screen.queryByText('변경됨')).not.toBeInTheDocument()
    expect(screen.queryByText('새로 생김')).not.toBeInTheDocument()
  })

  it('어떤 변수도 가리키지 않는 객체에 "더 이상 접근할 수 없음"을 표시한다', () => {
    const state: MemoryState = {
      scopes: [
        {
          id: 'top',
          label: '코드 전체',
          bindings: [{ name: 'p', declaredWith: 'let', value: { kind: 'object', id: 'A' } }],
        },
      ],
      objects: [
        { id: 'A', label: '객체 A', props: [{ key: 'n', value: num(1) }] },
        { id: 'B', label: '객체 B', props: [{ key: 'n', value: num(0) }] },
      ],
    }
    render(<MemoryView state={state} />)
    const cardB = screen.getByText('객체 B').closest('li')!
    expect(within(cardB).getByText('더 이상 접근할 수 없음')).toBeInTheDocument()
    expect(screen.getAllByText('더 이상 접근할 수 없음')).toHaveLength(1)
  })

  it('표시할 것이 없으면 빈 상태 문구를 보여 준다', () => {
    render(<MemoryView state={{ scopes: [], objects: [] }} />)
    expect(screen.getByText('아직 표시할 변수가 없습니다.')).toBeInTheDocument()
  })

  it('화살표 SVG는 보조 기술에서 숨겨진다', () => {
    const { container } = render(<MemoryView state={base} />)
    const svg = container.querySelector('svg')!
    expect(svg).toHaveAttribute('aria-hidden', 'true')
  })
})
