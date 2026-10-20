import { describe, expect, it } from 'vitest'
import { slugify } from './slugify'

describe('slugify', () => {
  it('한글을 유지하고 공백을 하이픈으로 바꾼다', () => {
    expect(slugify('동작 원리')).toBe('동작-원리')
  })

  it('문장부호를 제거하되 하이픈은 유지한다', () => {
    expect(slugify('결과와 이유: `const`는 왜?')).toBe('결과와-이유-const는-왜')
    expect(slugify('a-b (c)')).toBe('a-b-c')
  })

  it('연속 공백은 하나의 하이픈이 된다', () => {
    expect(slugify('  가   나 ')).toBe('가-나')
  })
})
