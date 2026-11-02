// 본문 "메서드 표로 정리" 표의 데이터. content.mdx와 concept.test.ts가 함께 쓴다(본문 표와 검증이 어긋나지 않게).
// 칸마다 probe(짧은 스크립트)를 새 vm 컨텍스트에서 실행해, 완료 값을 문자열로 바꾼 결과(오류가 나면 오류의 name)가 expected와 같은지 확인한다.
// exampleId가 null이 아닌 행은 같은 내용을 보이는 예제 id이고, meta.examples에 있어야 한다.
export type Cell = { text: string; probe: string; expected: string }

export const methods: {
  method: string
  exampleId: string | null
  mutates: Cell
  returns: Cell
}[] = [
  {
    method: 'push(4)',
    exampleId: 'return-values',
    mutates: {
      text: '바꿈',
      probe: 'var a = [3, 1, 2]; a.push(4); JSON.stringify(a)',
      expected: '[3,1,2,4]',
    },
    returns: {
      text: '새 length',
      probe: 'var a = [3, 1, 2]; var r = a.push(4); String(r)',
      expected: '4',
    },
  },
  {
    method: 'pop()',
    exampleId: 'return-values',
    mutates: {
      text: '바꿈',
      probe: 'var a = [3, 1, 2]; a.pop(); JSON.stringify(a)',
      expected: '[3,1]',
    },
    returns: {
      text: '꺼낸 요소',
      probe: 'var a = [3, 1, 2]; var r = a.pop(); String(r)',
      expected: '2',
    },
  },
  {
    method: 'splice(0, 1)',
    exampleId: 'return-values',
    mutates: {
      text: '바꿈',
      probe: 'var a = [3, 1, 2]; a.splice(0, 1); JSON.stringify(a)',
      expected: '[1,2]',
    },
    returns: {
      text: '지운 요소들의 새 배열',
      probe: 'var a = [3, 1, 2]; var r = a.splice(0, 1); JSON.stringify(r)',
      expected: '[3]',
    },
  },
  {
    method: 'sort()',
    exampleId: 'mutating-methods',
    mutates: {
      text: '바꿈',
      probe: 'var a = [3, 1, 2]; a.sort(); JSON.stringify(a)',
      expected: '[1,2,3]',
    },
    returns: {
      text: '원본 배열 자신',
      probe: 'var a = [3, 1, 2]; var r = a.sort(); String(r === a)',
      expected: 'true',
    },
  },
  {
    method: 'reverse()',
    exampleId: 'mutating-methods',
    mutates: {
      text: '바꿈',
      probe: 'var a = [3, 1, 2]; a.reverse(); JSON.stringify(a)',
      expected: '[2,1,3]',
    },
    returns: {
      text: '원본 배열 자신',
      probe: 'var a = [3, 1, 2]; var r = a.reverse(); String(r === a)',
      expected: 'true',
    },
  },
  {
    method: 'slice(1)',
    exampleId: 'mutating-methods',
    mutates: {
      text: '바꾸지 않음',
      probe: 'var a = [3, 1, 2]; a.slice(1); JSON.stringify(a)',
      expected: '[3,1,2]',
    },
    returns: {
      text: '새 배열',
      probe: 'var a = [3, 1, 2]; var r = a.slice(1); String(Array.isArray(r) && r !== a)',
      expected: 'true',
    },
  },
  {
    method: 'map(fn)',
    exampleId: 'mutating-methods',
    mutates: {
      text: '바꾸지 않음',
      probe: 'var a = [3, 1, 2]; a.map((n) => n * 2); JSON.stringify(a)',
      expected: '[3,1,2]',
    },
    returns: {
      text: '새 배열',
      probe: 'var a = [3, 1, 2]; var r = a.map((n) => n * 2); String(Array.isArray(r) && r !== a)',
      expected: 'true',
    },
  },
  {
    method: 'forEach(fn)',
    exampleId: 'return-values',
    mutates: {
      text: '바꾸지 않음',
      probe: 'var a = [3, 1, 2]; a.forEach((n) => n * 2); JSON.stringify(a)',
      expected: '[3,1,2]',
    },
    returns: {
      text: 'undefined',
      probe: 'var a = [3, 1, 2]; var r = a.forEach((n) => n * 2); String(r)',
      expected: 'undefined',
    },
  },
  {
    method: 'toSorted()',
    exampleId: 'copy-methods',
    mutates: {
      text: '바꾸지 않음',
      probe: 'var a = [3, 1, 2]; a.toSorted(); JSON.stringify(a)',
      expected: '[3,1,2]',
    },
    returns: {
      text: '새 배열',
      probe: 'var a = [3, 1, 2]; var r = a.toSorted(); String(Array.isArray(r) && r !== a)',
      expected: 'true',
    },
  },
  {
    method: 'toReversed()',
    exampleId: 'copy-methods',
    mutates: {
      text: '바꾸지 않음',
      probe: 'var a = [3, 1, 2]; a.toReversed(); JSON.stringify(a)',
      expected: '[3,1,2]',
    },
    returns: {
      text: '새 배열',
      probe: 'var a = [3, 1, 2]; var r = a.toReversed(); String(Array.isArray(r) && r !== a)',
      expected: 'true',
    },
  },
  {
    method: 'toSpliced(0, 1)',
    exampleId: 'copy-methods',
    mutates: {
      text: '바꾸지 않음',
      probe: 'var a = [3, 1, 2]; a.toSpliced(0, 1); JSON.stringify(a)',
      expected: '[3,1,2]',
    },
    returns: {
      text: '새 배열',
      probe: 'var a = [3, 1, 2]; var r = a.toSpliced(0, 1); String(Array.isArray(r) && r !== a)',
      expected: 'true',
    },
  },
  {
    method: 'with(0, 9)',
    exampleId: 'copy-methods',
    mutates: {
      text: '바꾸지 않음',
      probe: 'var a = [3, 1, 2]; a.with(0, 9); JSON.stringify(a)',
      expected: '[3,1,2]',
    },
    returns: {
      text: '새 배열',
      probe: 'var a = [3, 1, 2]; var r = a.with(0, 9); String(Array.isArray(r) && r !== a)',
      expected: 'true',
    },
  },
]
