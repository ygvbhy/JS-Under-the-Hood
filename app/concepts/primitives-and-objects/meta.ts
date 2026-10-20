import type { ConceptMeta } from '~/lib/concepts'

export const concept = {
  slug: 'primitives-and-objects',
  title: '원시 값과 객체: 재할당과 변경',
  summary:
    '재할당은 다른 변수에 영향을 주지 않고, 객체의 변경은 같은 객체를 가진 모든 변수에서 보인다.',
  category: 'fundamentals',
  tags: ['원시 값', '객체', '재할당', '변경'],
  goals: ['재할당과 변경의 차이를 설명할 수 있다.'],
  prerequisites: [{ label: '변수' }, { label: '데이터 타입' }],
  related: [],
  examples: [
    { id: 'scenario-1', file: 'scenario-1.js', runtime: 'ecmascript', expectedOutput: ['10 20'] },
  ],
  simplifications: ['임시 단순화 항목: 첫 개념 작성 단계(7단계)에서 실제 내용으로 교체한다.'],
  references: [
    {
      label: 'MDN: Primitive',
      url: 'https://developer.mozilla.org/ko/docs/Glossary/Primitive',
    },
  ],
  reviewedAt: null,
} satisfies ConceptMeta
