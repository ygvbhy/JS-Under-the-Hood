import { describe, expect, it } from 'vitest'
import { runExample } from './helpers/run-example'

describe('runExample', () => {
  it('Promise 콜백 안의 console.log를 동기 출력 뒤 순서로 수집한다', () => {
    expect(
      runExample("Promise.resolve().then(() => console.log('late')); console.log('sync')"),
    ).toEqual(['sync', 'late'])
  })

  it('무한 microtask 루프는 timeout에서 throw한다', () => {
    expect(() =>
      runExample('(function f() { Promise.resolve().then(f) })()', { timeoutMs: 100 }),
    ).toThrow()
  })

  it('동기 무한 루프는 timeout에서 throw한다', () => {
    expect(() => runExample('while (true) {}', { timeoutMs: 100 })).toThrow()
  })
})
