import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MatchAllView } from './MatchAllView'
import { scenarios } from './scenarios'
import type { MatchAllState } from './scenarios'

const one = scenarios.find((s) => s.id === 'next-one-by-one')!
const two = scenarios.find((s) => s.id === 'inherit-empty')!

describe('MatchAllView', () => {
  it('빈 상태에서는 카드·이터레이터·검색 문자열·호출·매치 없음 문구를 보여 준다', () => {
    render(<MatchAllView state={one.steps[0].state} />)
    expect(screen.getByText('아직 만든 정규 표현식이 없습니다.')).toBeInTheDocument()
    expect(screen.getByText('아직 이터레이터가 없습니다.')).toBeInTheDocument()
    expect(screen.getByText('아직 검색 문자열이 없습니다.')).toBeInTheDocument()
    expect(screen.getByText('이번 단계에서는 호출이 없습니다.')).toBeInTheDocument()
    expect(screen.getByText('아직 받은 매치가 없습니다.')).toBeInTheDocument()
  })

  it('matchAll 단계에는 코드에 이름이 없는 복제본 카드와 이터레이터 슬롯이 나타난다', () => {
    render(<MatchAllView state={one.steps[2].state} prevState={one.steps[1].state} />)
    const clone = document.querySelector<HTMLElement>('[data-card="clone"]')!
    expect(within(clone).getByText('복제본')).toBeInTheDocument()
    expect(within(clone).getByText('코드에 이름이 없음')).toBeInTheDocument()
    expect(within(clone).getByText('lastIndex 0')).toBeInTheDocument()
    expect(screen.getByText('[[Done]] false')).toBeInTheDocument()
    expect(screen.getByText('[[Global]] true')).toBeInTheDocument()
    expect(screen.getByText('[[Unicode]] false')).toBeInTheDocument()
  })

  it('첫 next 단계는 exec 호출과 매치 칸을 보이고 복제본 lastIndex만 바뀐다', () => {
    render(<MatchAllView state={one.steps[3].state} prevState={one.steps[2].state} />)
    expect(
      screen.getByText(/복제본\.exec\('a1b22'\): lastIndex 0에서 시작 → 1번 칸에 매치/),
    ).toBeInTheDocument()
    const cell1 = document.querySelector<HTMLElement>('[data-cell-index="1"]')!
    expect(within(cell1).getByText('매치')).toBeInTheDocument()
    const clone = document.querySelector<HTMLElement>('[data-card="clone"]')!
    expect(within(clone).getByText('lastIndex 2 (바뀜)')).toBeInTheDocument()
    const orig = document.querySelector<HTMLElement>('[data-card="original"]')!
    expect(within(orig).getByText('lastIndex 0')).toBeInTheDocument()
  })

  it('[[Done]]이 true가 되는 단계는 바뀜을 표시하고, 다음 next는 exec 없이 끝난다', () => {
    const miss = one.steps[7].state
    render(<MatchAllView state={miss} prevState={one.steps[6].state} />)
    expect(screen.getByText('[[Done]] true (바뀜)')).toBeInTheDocument()
    expect(screen.getByText(/exec가 null이라 \[\[Done\]\]을 true로 하고/)).toBeInTheDocument()
  })

  it('[[Done]]이 true인 next 단계는 exec 호출 줄이 없다', () => {
    render(<MatchAllView state={one.steps[9].state} prevState={one.steps[8].state} />)
    expect(screen.getByText(/\[\[Done\]\]이 true라 exec 없이/)).toBeInTheDocument()
    expect(screen.queryByText(/복제본\.exec/)).toBeNull()
  })

  it('빈 매치 단계는 빈 매치 표시와 advance 호출(3에서 4)을 보이고 exec와 advance 값이 다르다', () => {
    const step = two.steps[6]
    render(<MatchAllView state={step.state} prevState={two.steps[5].state} />)
    const cell3 = document.querySelector<HTMLElement>('[data-cell-index="3"]')!
    expect(within(cell3).getByText('빈 매치')).toBeInTheDocument()
    expect(
      screen.getByText(/lastIndex 2에서 시작 → 3번 위치의 빈 문자열에 매치 → lastIndex 3/),
    ).toBeInTheDocument()
    expect(screen.getByText(/복제본의 lastIndex를 3에서 4로 한 칸 더 옮김/)).toBeInTheDocument()
    expect(screen.getByText('"" · index 3')).toBeInTheDocument()
  })

  it('advance 문구의 조사는 받침에 맞춘다: 5에서 6으로', () => {
    render(<MatchAllView state={two.steps[8].state} prevState={two.steps[7].state} />)
    expect(screen.getByText(/복제본의 lastIndex를 5에서 6으로 한 칸 더 옮김/)).toBeInTheDocument()
  })

  it('이어받기 단계는 re와 복제본의 lastIndex가 서로 다르다', () => {
    render(<MatchAllView state={two.steps[4].state} prevState={two.steps[3].state} />)
    const orig = document.querySelector<HTMLElement>('[data-card="original"]')!
    const clone = document.querySelector<HTMLElement>('[data-card="clone"]')!
    expect(within(orig).getByText('lastIndex 0 (바뀜)')).toBeInTheDocument()
    expect(within(clone).getByText('lastIndex 2')).toBeInTheDocument()
  })

  it('get-iterator 호출은 자기 자신을 돌려준다고 보인다', () => {
    const state: MatchAllState = two.steps[5].state
    render(<MatchAllView state={state} />)
    expect(screen.getByText('it[Symbol.iterator]() → it 자기 자신')).toBeInTheDocument()
  })
})
