import type { TreeNode, TreeNodeKind } from './node-tree'
import { isWhitespaceOnly } from './node-tree'

const KIND_LABELS: Record<TreeNodeKind, string> = {
  document: '문서',
  doctype: '문서 유형',
  element: '요소',
  text: '텍스트',
  comment: '주석',
}

const badgeClass =
  'border-border bg-surface text-fg shrink-0 rounded border px-1.5 text-xs leading-5 whitespace-nowrap'

function NodeItem({ node }: { node: TreeNode }) {
  const hasValue = node.value !== undefined
  return (
    <li>
      <div className="flex items-center gap-1.5 py-0.5">
        <span className={badgeClass}>{KIND_LABELS[node.kind]}</span>
        <code className="font-mono text-sm whitespace-nowrap">{node.name}</code>
        {hasValue && (
          <code className="text-muted font-mono text-sm whitespace-pre">
            {JSON.stringify(node.value)}
          </code>
        )}
        {node.kind === 'text' && hasValue && isWhitespaceOnly(node.value!) && (
          <span className={`${badgeClass} border-dashed`}>공백</span>
        )}
      </div>
      {node.children.length > 0 && (
        <ul className="border-border ml-2 border-l pl-4">
          {node.children.map((child, i) => (
            <NodeItem key={i} node={child} />
          ))}
        </ul>
      )}
    </li>
  )
}

export function NodeTreeView({ root, label }: { root: TreeNode; label: string }) {
  return (
    <div
      role="region"
      aria-label={label}
      tabIndex={0}
      className="border-border bg-surface overflow-x-auto rounded-lg border p-3"
    >
      <p className="text-muted mb-2 text-xs">
        종류 배지: 문서·문서 유형·요소·텍스트·주석. 텍스트와 주석의 값은 JSON 문자열로 보여 줄바꿈이
        \n으로 드러납니다. 공백 배지는 공백 문자만 있는 텍스트 노드입니다.
      </p>
      <ul>
        <NodeItem node={root} />
      </ul>
    </div>
  )
}
