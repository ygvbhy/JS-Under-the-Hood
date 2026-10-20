import mdx from '@mdx-js/rollup'
import { reactRouter } from '@react-router/dev/vite'
import rehypeShiki from '@shikijs/rehype'
import tailwindcss from '@tailwindcss/vite'
import remarkCodeImport from 'remark-code-import'
import { defineConfig } from 'vite'

export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    {
      enforce: 'pre',
      ...mdx({
        remarkPlugins: [[remarkCodeImport, {}]],
        rehypePlugins: [[rehypeShiki, { themes: { light: 'github-light', dark: 'github-dark' } }]],
      }),
    },
    tailwindcss(),
    reactRouter(),
  ],
})
