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
  runInNewContext(code, sandbox, { timeout: timeoutMs })
  return out
}
