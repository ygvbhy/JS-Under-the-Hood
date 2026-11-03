import { concept } from './meta'
import { parseNodeLines } from './node-tree'

// 본문 트리 그림의 데이터. 예제 1(tree)의 검증된 expectedOutput만으로 만든다.
const tree = concept.examples.find((example) => example.id === 'tree')
if (!tree) throw new Error('tree 예제가 meta.examples에 없습니다')

export const treeRoot = parseNodeLines(tree.expectedOutput)
