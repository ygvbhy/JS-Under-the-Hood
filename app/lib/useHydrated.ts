import { useSyncExternalStore } from 'react'

const subscribe = () => () => {}

// 서버 렌더와 하이드레이션 첫 렌더에서는 false, 하이드레이션 이후(마운트 후)에는 true.
// 프리렌더 시점에 알 수 없는 값(URL query 등)으로 첫 마크업을 바꾸지 않기 위해 쓴다.
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  )
}
