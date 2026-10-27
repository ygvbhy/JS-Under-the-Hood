import { format } from 'node:util'
import { runInNewContext } from 'node:vm'

// 주의: node:vm은 보안 경계가 아니다. 저장소에 포함된 신뢰된 예제만 실행한다.
// 예제마다 새 컨텍스트에서 sloppy script로 실행하고 console.log 출력을 줄 단위로 수집한다.
export function runExample(
  code: string,
  { timeoutMs = 2000 }: { timeoutMs?: number } = {},
): string[] {
  const out: string[] = []
  const sandbox = {
    console: { log: (...args: unknown[]) => out.push(format(...args)) },
  }
  // afterEvaluate: 예제가 예약한 microtask를 같은 timeout 안에서 평가 직후 실행해, Promise 콜백의 console.log도 반환 전에 수집한다.
  runInNewContext(code, sandbox, { timeout: timeoutMs, microtaskMode: 'afterEvaluate' })
  return out
}
