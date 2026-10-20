import mdx from '@mdx-js/rollup'
import { reactRouter } from '@react-router/dev/vite'
import rehypeShiki from '@shikijs/rehype'
import tailwindcss from '@tailwindcss/vite'
import remarkCodeImport from 'remark-code-import'
import { defineConfig, type Plugin } from 'vite'

// remark-code-import는 예제 파일을 Vite의 watch 의존성으로 등록하지 않아서, dev에서 예제를 고쳐도
// content.mdx 모듈이 갱신되지 않는다(코드 블록이 낡고 하이드레이션 오류가 난다).
// 예제가 바뀌면 같은 개념 폴더의 content.mdx 모듈을 무효화하고 HMR 대상에 포함시킨다.
function conceptExampleHmr(): Plugin {
  return {
    name: 'concept-example-hmr',
    apply: 'serve',
    hotUpdate({ file, modules }) {
      const match = /^(.*\/app\/concepts\/[^/]+)\/examples\//.exec(file)
      if (!match) return
      const mdxModules = this.environment.moduleGraph.getModulesByFile(`${match[1]}/content.mdx`)
      if (!mdxModules) return
      for (const mod of mdxModules) this.environment.moduleGraph.invalidateModule(mod)
      return [...modules, ...mdxModules]
    },
  }
}

export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    {
      enforce: 'pre',
      ...mdx({
        remarkPlugins: [[remarkCodeImport, {}]],
        // 두 테마 모두 모든 토큰 색이 배경 대비 WCAG AA(4.5:1) 이상이다(github-light의 주황, github-dark의 주석 색은 미달)
        rehypePlugins: [
          [rehypeShiki, { themes: { light: 'github-light-default', dark: 'github-dark-default' } }],
        ],
      }),
    },
    tailwindcss(),
    reactRouter(),
    conceptExampleHmr(),
  ],
})
