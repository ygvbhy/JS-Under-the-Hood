import type { Config } from '@react-router/dev/config'

export default {
  ssr: false,
  prerender: ({ getStaticPaths }) => [...getStaticPaths(), '/404'],
} satisfies Config
