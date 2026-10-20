import { useCallback, useEffect, useState } from 'react'

export const SPEEDS = [0.5, 1, 2] as const
export type Speed = (typeof SPEEDS)[number]

export type Stepper = {
  index: number // 0-based 현재 단계
  total: number
  isFirst: boolean
  isLast: boolean
  next: () => void
  prev: () => void
  reset: () => void
  goTo: (index: number) => void
  playing: boolean
  play: () => void
  pause: () => void
  toggle: () => void
  speed: Speed
  setSpeed: (speed: Speed) => void
}

type Options = {
  total: number
  baseIntervalMs?: number // speed 1일 때 단계 간격
}

export function useStepper({ total, baseIntervalMs = 1500 }: Options): Stepper {
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState<Speed>(1)
  const [prevTotal, setPrevTotal] = useState(total)

  // 시나리오 전환 등으로 total이 바뀌면 처음 단계·정지로 되돌린다.
  // effect 대신 렌더 중 상태 조정을 써서 범위를 벗어난 index가 한 번도 렌더되지 않게 한다.
  if (prevTotal !== total) {
    setPrevTotal(total)
    setIndex(0)
    setPlaying(false)
  }

  const lastIndex = Math.max(total - 1, 0)
  const intervalMs = baseIntervalMs / speed

  // 단계마다 타이머를 새로 건다(setTimeout 연쇄). 속도를 바꾸면 남은 대기가 새 간격으로 다시 시작된다.
  useEffect(() => {
    if (!playing || index >= lastIndex) return
    const id = setTimeout(() => {
      const nextIndex = index + 1
      setIndex(nextIndex)
      if (nextIndex >= lastIndex) setPlaying(false) // 마지막 단계에서 자동 정지
    }, intervalMs)
    return () => clearTimeout(id)
  }, [playing, index, lastIndex, intervalMs])

  const next = useCallback(() => {
    setPlaying(false)
    setIndex((i) => Math.min(i + 1, lastIndex))
  }, [lastIndex])

  const prev = useCallback(() => {
    setPlaying(false)
    setIndex((i) => Math.max(i - 1, 0))
  }, [])

  const reset = useCallback(() => {
    setPlaying(false)
    setIndex(0)
  }, [])

  const goTo = useCallback(
    (target: number) => {
      if (Number.isNaN(target)) return
      setPlaying(false)
      setIndex(Math.min(Math.max(Math.trunc(target), 0), lastIndex))
    },
    [lastIndex],
  )

  const pause = useCallback(() => setPlaying(false), [])

  // 마지막 단계에서 재생하면 처음부터 다시 재생한다(일반적인 미디어 플레이어 UX).
  // 단계가 1개 이하면 재생할 것이 없으므로 아무것도 하지 않는다.
  const play = useCallback(() => {
    if (lastIndex === 0) return
    setIndex((i) => (i >= lastIndex ? 0 : i))
    setPlaying(true)
  }, [lastIndex])

  const toggle = useCallback(() => {
    if (playing) pause()
    else play()
  }, [playing, pause, play])

  return {
    index,
    total,
    isFirst: index === 0,
    isLast: index >= lastIndex,
    next,
    prev,
    reset,
    goTo,
    playing,
    play,
    pause,
    toggle,
    speed,
    setSpeed,
  }
}
