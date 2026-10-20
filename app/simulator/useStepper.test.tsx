import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useStepper } from './useStepper'

beforeEach(() => {
  vi.useFakeTimers()
})
afterEach(() => {
  vi.useRealTimers()
})

describe('useStepper', () => {
  it('첫 단계에서 prev는 무시한다', () => {
    const { result } = renderHook(() => useStepper({ total: 3 }))
    act(() => result.current.prev())
    expect(result.current.index).toBe(0)
    expect(result.current.isFirst).toBe(true)
  })

  it('마지막 단계에서 next는 무시한다', () => {
    const { result } = renderHook(() => useStepper({ total: 3 }))
    act(() => result.current.next())
    act(() => result.current.next())
    act(() => result.current.next())
    expect(result.current.index).toBe(2)
    expect(result.current.isLast).toBe(true)
  })

  it('자동 재생은 한 단계씩 진행하고 마지막에서 정지한다', () => {
    const { result } = renderHook(() => useStepper({ total: 3 }))
    act(() => result.current.play())
    expect(result.current.playing).toBe(true)
    act(() => vi.advanceTimersByTime(1500))
    expect(result.current.index).toBe(1)
    expect(result.current.playing).toBe(true)
    act(() => vi.advanceTimersByTime(1500))
    expect(result.current.index).toBe(2)
    expect(result.current.playing).toBe(false)
    act(() => vi.advanceTimersByTime(10_000))
    expect(result.current.index).toBe(2)
  })

  it('speed 2는 750ms 간격으로 진행한다', () => {
    const { result } = renderHook(() => useStepper({ total: 5 }))
    act(() => result.current.setSpeed(2))
    act(() => result.current.play())
    act(() => vi.advanceTimersByTime(749))
    expect(result.current.index).toBe(0)
    act(() => vi.advanceTimersByTime(1))
    expect(result.current.index).toBe(1)
  })

  it('speed 0.5는 3000ms 간격으로 진행한다', () => {
    const { result } = renderHook(() => useStepper({ total: 5 }))
    act(() => result.current.setSpeed(0.5))
    act(() => result.current.play())
    act(() => vi.advanceTimersByTime(2999))
    expect(result.current.index).toBe(0)
    act(() => vi.advanceTimersByTime(1))
    expect(result.current.index).toBe(1)
  })

  it('재생 중 속도를 바꾸면 이후 단계부터 새 간격이 적용된다', () => {
    const { result } = renderHook(() => useStepper({ total: 5 }))
    act(() => result.current.play())
    act(() => vi.advanceTimersByTime(1500))
    expect(result.current.index).toBe(1)
    act(() => result.current.setSpeed(2))
    act(() => vi.advanceTimersByTime(750))
    expect(result.current.index).toBe(2)
  })

  it('재생 중 수동 next는 재생을 멈춘다', () => {
    const { result } = renderHook(() => useStepper({ total: 5 }))
    act(() => result.current.play())
    act(() => result.current.next())
    expect(result.current.index).toBe(1)
    expect(result.current.playing).toBe(false)
    act(() => vi.advanceTimersByTime(5000))
    expect(result.current.index).toBe(1)
  })

  it('재생 중 수동 prev와 goTo도 재생을 멈춘다', () => {
    const { result } = renderHook(() => useStepper({ total: 5 }))
    act(() => result.current.goTo(3))
    act(() => result.current.play())
    act(() => result.current.prev())
    expect(result.current.playing).toBe(false)
    act(() => result.current.play())
    act(() => result.current.goTo(1))
    expect(result.current.playing).toBe(false)
    expect(result.current.index).toBe(1)
  })

  it('reset은 0단계로 되돌리고 정지한다', () => {
    const { result } = renderHook(() => useStepper({ total: 5 }))
    act(() => result.current.goTo(3))
    act(() => result.current.play())
    act(() => result.current.reset())
    expect(result.current.index).toBe(0)
    expect(result.current.playing).toBe(false)
  })

  it('goTo는 범위로 clamp한다', () => {
    const { result } = renderHook(() => useStepper({ total: 4 }))
    act(() => result.current.goTo(99))
    expect(result.current.index).toBe(3)
    act(() => result.current.goTo(-5))
    expect(result.current.index).toBe(0)
  })

  it('마지막 단계에서 play하면 처음부터 다시 재생한다', () => {
    const { result } = renderHook(() => useStepper({ total: 3 }))
    act(() => result.current.goTo(2))
    act(() => result.current.play())
    expect(result.current.index).toBe(0)
    expect(result.current.playing).toBe(true)
    act(() => vi.advanceTimersByTime(1500))
    expect(result.current.index).toBe(1)
  })

  it('toggle은 재생과 일시정지를 전환한다', () => {
    const { result } = renderHook(() => useStepper({ total: 3 }))
    act(() => result.current.toggle())
    expect(result.current.playing).toBe(true)
    act(() => result.current.toggle())
    expect(result.current.playing).toBe(false)
  })

  it('단계가 1개뿐이면 play는 아무 일도 하지 않는다', () => {
    const { result } = renderHook(() => useStepper({ total: 1 }))
    act(() => result.current.play())
    expect(result.current.playing).toBe(false)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('재생 중 언마운트하면 대기 중인 타이머가 없다', () => {
    const { result, unmount } = renderHook(() => useStepper({ total: 5 }))
    act(() => result.current.play())
    expect(vi.getTimerCount()).toBe(1)
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('일시정지하면 타이머가 정리된다', () => {
    const { result } = renderHook(() => useStepper({ total: 5 }))
    act(() => result.current.play())
    act(() => result.current.pause())
    expect(vi.getTimerCount()).toBe(0)
  })

  it('total이 바뀌면 0단계로 돌아가고 정지한다', () => {
    const { result, rerender } = renderHook(({ total }) => useStepper({ total }), {
      initialProps: { total: 5 },
    })
    act(() => result.current.goTo(3))
    act(() => result.current.play())
    rerender({ total: 3 })
    expect(result.current.index).toBe(0)
    expect(result.current.playing).toBe(false)
    expect(result.current.total).toBe(3)
    expect(vi.getTimerCount()).toBe(0)
  })
})
