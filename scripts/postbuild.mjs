import { copyFileSync, existsSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const clientDir = join(process.cwd(), 'build', 'client')

// 404 프리렌더 결과를 정적 호스트가 미지 경로에 사용하는 404.html로 복사
const notFoundSrc = join(clientDir, '404', 'index.html')
if (!existsSync(notFoundSrc)) {
  throw new Error(`프리렌더된 404 페이지가 없습니다: ${notFoundSrc}`)
}
copyFileSync(notFoundSrc, join(clientDir, '404.html'))

// 모든 경로가 프리렌더되므로 SPA fallback은 불필요 (200 응답 쓰레기 페이지 방지)
rmSync(join(clientDir, '__spa-fallback.html'), { force: true })
