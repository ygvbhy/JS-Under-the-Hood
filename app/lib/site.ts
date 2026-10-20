export const SITE_NAME = 'JS Under the Hood'

export const SITE_DESCRIPTION =
  '자바스크립트 코드가 왜 그렇게 동작하는지 눈으로 확인하는 인터랙티브 학습 사이트'

// 클라이언트 번들에는 process가 없으므로 import.meta.env를 쓴다. 기본값은 .env 한 곳에서 관리한다.
export const SITE_URL = (
  import.meta.env.VITE_SITE_URL ?? 'https://js-under-the-hood.vercel.app'
).replace(/\/$/, '')
