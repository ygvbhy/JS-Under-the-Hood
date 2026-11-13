import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { KeyOrderView } from './KeyOrderView'
import { scenarios } from './scenarios'

const scenario = (id: string) => scenarios.find((s) => s.id === id)!
const stepAtLine = (id: string, line: number) =>
  scenario(id).steps.find((s) => s.line?.from === line)!

const INDEX_LANE = '배열 인덱스 키 (작은 수부터)'
const STRING_LANE = '그 밖의 문자열 키 (만든 순서)'

describe('KeyOrderView', () => {
  it('객체가 없으면 빈 상태 문구를 보여 준다', () => {
    render(<KeyOrderView state={{ objects: [] }} />)
    expect(screen.getByText('아직 표시할 객체가 없습니다.')).toBeInTheDocument()
  })

  it('객체 카드마다 두 영역의 제목과 비어 있을 때 "없음"을 보여 준다', () => {
    render(<KeyOrderView state={stepAtLine('basic-order', 1).state} />)
    expect(screen.getByRole('region', { name: INDEX_LANE })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: STRING_LANE })).toBeInTheDocument()
    expect(screen.getAllByText('없음')).toHaveLength(2)
    expect(screen.getByText('[]')).toBeInTheDocument()
  })

  it('두 영역을 이은 Object.keys 결과 줄을 보여 준다', () => {
    render(<KeyOrderView state={stepAtLine('basic-order', 6).state} />)
    expect(screen.getByText('Object.keys 결과')).toBeInTheDocument()
    expect(screen.getByText('["1","2","title","author"]')).toBeInTheDocument()
  })

  it('reassign-delete: user.name = "Park" 단계에는 "값 바뀜"만 있고 "새로 생김"은 없다', () => {
    render(<KeyOrderView state={stepAtLine('reassign-delete', 2).state} />)
    expect(screen.getByText('값 바뀜')).toBeInTheDocument()
    expect(screen.queryByText('새로 생김')).toBeNull()
  })

  it('reassign-delete: delete user.name 단계에 "지워짐: "name""이 보인다', () => {
    render(<KeyOrderView state={stepAtLine('reassign-delete', 4).state} />)
    expect(screen.getByText('지워짐: "name"')).toBeInTheDocument()
  })

  it('reassign-delete: 다시 만든 name은 "새로 생김"이다', () => {
    render(<KeyOrderView state={stepAtLine('reassign-delete', 5).state} />)
    expect(screen.getByText('새로 생김')).toBeInTheDocument()
    expect(screen.queryByText('값 바뀜')).toBeNull()
  })

  it('not-index 마지막 단계: 4294967294는 배열 인덱스 영역, 4294967295는 문자열 영역', () => {
    render(<KeyOrderView state={stepAtLine('not-index', 9).state} />)
    const indexLane = screen.getByRole('region', { name: INDEX_LANE })
    const stringLane = screen.getByRole('region', { name: STRING_LANE })
    expect(within(indexLane).getByText('"4294967294"')).toBeInTheDocument()
    expect(within(indexLane).queryByText('"4294967295"')).toBeNull()
    expect(within(stringLane).getByText('"4294967295"')).toBeInTheDocument()
    expect(within(stringLane).queryByText('"4294967294"')).toBeNull()
  })
})
