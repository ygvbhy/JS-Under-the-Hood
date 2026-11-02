import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { RegexView } from './RegexView'
import { scenarios } from './scenarios'
import type { RegexState } from './scenarios'

const alt = scenarios.find((s) => s.id === 'test-alternates')!

const callState = (before: number, start: number | null, after: number): RegexState => ({
  regexes: [{ name: 're', literal: '/a/g', lastIndex: after }],
  calls: [
    {
      regex: 're',
      method: 'test',
      input: 'aa',
      before,
      match: start === null ? null : { start, end: start + 1 },
      after,
    },
  ],
})

describe('RegexView', () => {
  it('카드가 없으면 빈 상태 문구를, calls가 없으면 검색 없음 문구를 보여 준다', () => {
    render(<RegexView state={{ regexes: [], calls: [] }} />)
    expect(screen.getByText('아직 만든 정규 표현식이 없습니다.')).toBeInTheDocument()
    expect(screen.getByText('이 단계에서는 검색이 없습니다.')).toBeInTheDocument()
  })

  it('매치 칸에 "매치" 텍스트와 시작·다음 표시가 나온다', () => {
    render(<RegexView state={callState(0, 0, 1)} />)
    expect(screen.getByText("re.test('aa')")).toBeInTheDocument()
    const cell0 = document.querySelector<HTMLElement>('[data-cell-index="0"]')!
    expect(within(cell0).getByText('매치')).toBeInTheDocument()
    expect(within(cell0).getByText('시작')).toBeInTheDocument()
    const cell1 = document.querySelector<HTMLElement>('[data-cell-index="1"]')!
    expect(within(cell1).getByText('다음')).toBeInTheDocument()
    expect(within(cell1).queryByText('매치')).toBeNull()
    expect(screen.getByText(/결과: true/)).toBeInTheDocument()
    expect(screen.getByText(/lastIndex 0 → 1/)).toBeInTheDocument()
  })

  it('끝 칸이 있고, before가 입력 길이면 끝 칸에 "시작"이 표시되며 실패는 false다', () => {
    render(<RegexView state={callState(2, null, 0)} />)
    const end = document.querySelector<HTMLElement>('[data-cell-index="2"]')!
    expect(within(end).getByText('끝')).toBeInTheDocument()
    expect(within(end).getByText('시작')).toBeInTheDocument()
    const first = document.querySelector<HTMLElement>('[data-cell-index="0"]')!
    expect(within(first).getByText('다음')).toBeInTheDocument()
    expect(screen.getByText(/결과: false/)).toBeInTheDocument()
    expect(screen.queryByText('매치')).toBeNull()
    expect(screen.getByLabelText("'aa'의 글자 칸")).toBeInTheDocument()
  })

  it('exec 실패는 null, 성공은 index를 보여 준다', () => {
    const base = callState(0, 1, 2)
    const exec = (match: { start: number; end: number } | null): RegexState => ({
      ...base,
      calls: [{ ...base.calls[0], method: 'exec', match }],
    })
    const { rerender } = render(<RegexView state={exec(null)} />)
    expect(screen.getByText(/결과: null/)).toBeInTheDocument()
    rerender(<RegexView state={exec({ start: 1, end: 2 })} />)
    expect(screen.getByText(/결과: index 1/)).toBeInTheDocument()
  })

  it('lastIndex가 바뀌면 "(바뀜)"을 표시하고, 안 바뀌면 표시하지 않는다', () => {
    const prev: RegexState = { regexes: [{ name: 're', literal: '/a/g', lastIndex: 0 }], calls: [] }
    const { rerender } = render(<RegexView state={callState(0, 0, 1)} prevState={prev} />)
    expect(screen.getByText('lastIndex 1 (바뀜)')).toBeInTheDocument()
    rerender(<RegexView state={prev} prevState={prev} />)
    expect(screen.getByText('lastIndex 0')).toBeInTheDocument()
  })

  it('test-alternates 3번째 검색 단계는 끝 칸에서 시작해 false로 끝난다', () => {
    const step = alt.steps.find((s) => s.state.calls.some((c) => c.before === c.input.length))!
    render(<RegexView state={step.state} />)
    const call = step.state.calls[0]
    const end = document.querySelector<HTMLElement>(`[data-cell-index="${call.input.length}"]`)!
    expect(within(end).getByText('시작')).toBeInTheDocument()
    expect(screen.getByText(/결과: false/)).toBeInTheDocument()
  })
})
