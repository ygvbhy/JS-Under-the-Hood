import { renderHook } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { useHydrated } from './useHydrated'

function Probe() {
  return <span>{String(useHydrated())}</span>
}

describe('useHydrated', () => {
  it('서버 렌더에서는 false다', () => {
    expect(renderToString(<Probe />)).toContain('false')
  })

  it('클라이언트에서 마운트되면 true다', () => {
    const { result } = renderHook(() => useHydrated())
    expect(result.current).toBe(true)
  })
})
