// 트리 그림은 tree 예제의 검증된 expectedOutput(Chromium에서 실제 DOM을 순회해 찍은 줄)만으로 만든다.
// 별도 데이터를 두지 않으므로 그림이 실제 DOM과 어긋날 수 없고, 형식이 어긋나면 throw해 테스트와 빌드가 실패한다.

export type TreeNodeKind = 'document' | 'doctype' | 'element' | 'text' | 'comment'

export type TreeNode = {
  name: string
  kind: TreeNodeKind
  value?: string
  children: TreeNode[]
}

export function isWhitespaceOnly(value: string): boolean {
  return /^\s*$/.test(value)
}

function kindOf(name: string, depth: number): TreeNodeKind {
  if (name === '#document') return 'document'
  if (name === '#text') return 'text'
  if (name === '#comment') return 'comment'
  if (depth === 1 && !name.startsWith('#') && name !== name.toUpperCase()) return 'doctype'
  return 'element'
}

export function parseNodeLines(lines: string[]): TreeNode {
  let root: TreeNode | null = null
  const stack: TreeNode[] = []

  lines.forEach((line, index) => {
    const indent = line.length - line.trimStart().length
    if (indent % 2 !== 0) throw new Error(`들여쓰기가 홀수입니다 (줄 ${index + 1}): ${line}`)
    const depth = indent / 2
    const body = line.slice(indent)

    if (index === 0 && depth !== 0) throw new Error('첫 줄은 깊이 0이어야 합니다')
    if (index > 0 && depth === 0) throw new Error(`깊이 0인 줄이 둘 이상입니다 (줄 ${index + 1})`)
    if (index > 0 && depth > stack.length) {
      throw new Error(`깊이가 2 이상 건너뜁니다 (줄 ${index + 1}): ${line}`)
    }

    const space = body.indexOf(' ')
    const name = space === -1 ? body : body.slice(0, space)
    const node: TreeNode = { name, kind: kindOf(name, depth), children: [] }
    if (space !== -1) {
      let parsed: unknown
      try {
        parsed = JSON.parse(body.slice(space + 1))
      } catch {
        throw new Error(`값이 JSON 문자열이 아닙니다 (줄 ${index + 1}): ${line}`)
      }
      if (typeof parsed !== 'string') {
        throw new Error(`값이 JSON 문자열이 아닙니다 (줄 ${index + 1}): ${line}`)
      }
      node.value = parsed
    }

    stack.length = depth
    if (depth === 0) root = node
    else {
      const parent = stack[depth - 1]
      // 텍스트·주석 노드는 자식을 가질 수 없다(DOM 표준 노드 트리 표)
      if (parent.kind === 'text' || parent.kind === 'comment') {
        throw new Error(`텍스트·주석 노드 아래에 자식이 있습니다 (줄 ${index + 1}): ${line}`)
      }
      parent.children.push(node)
    }
    stack.push(node)
  })

  if (root === null) throw new Error('줄이 없습니다')
  return root
}
