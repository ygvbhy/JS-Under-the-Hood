import { useId } from 'react'
import type { Binding, ConvState, Operand, Rule, Val } from './scenarios'

type Props = {
  state: ConvState
}

const TYPE_LABELS: Record<Val['type'], string> = {
  string: '문자열',
  number: '숫자',
  boolean: '불리언',
}

const RULE_LABELS: Record<Rule, string> = {
  concat: '한쪽이 문자열이므로 문자열 연결',
  add: '문자열이 없으므로 숫자 덧셈',
  numeric: '피연산자를 숫자로 바꿔 계산',
  'string-compare': '둘 다 문자열이므로 문자열로 비교',
  'numeric-compare': '둘 다 문자열은 아니므로 숫자로 바꿔 비교',
}

const badgeClass =
  'border-border bg-surface text-fg shrink-0 rounded border px-1.5 text-xs leading-5 whitespace-nowrap'
const fade = 'motion-safe:transition-[background-color,opacity] motion-safe:duration-300'
const wrap = 'break-words [overflow-wrap:anywhere]'

function formatVal(value: Val): string {
  return value.type === 'string' ? `"${value.display}"` : value.display
}

function Badge({ children }: { children: string }) {
  return <span className={badgeClass}>{children}</span>
}

function OperandCard({ side, operand }: { side: string; operand: Operand }) {
  const { converted } = operand
  return (
    <div className={`border-border bg-surface min-w-0 rounded-md border px-2 py-1 ${fade}`}>
      <p className="text-muted text-xs">{side}</p>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className={`min-w-0 font-mono ${wrap}`}>{operand.code}</span>
        <Badge>{TYPE_LABELS[operand.value.type]}</Badge>
      </div>
      <p className="text-sm">
        <span className="text-muted text-xs">값 </span>
        <span className={`font-mono ${wrap}`}>{formatVal(operand.value)}</span>
      </p>
      {converted && (
        <p className={`mt-1 text-sm font-semibold ${wrap}`}>
          <span className="font-mono">{`→ ${formatVal(converted.to)}`}</span>
          {` (${TYPE_LABELS[converted.to.type]}, ${converted.via})`}
        </p>
      )}
    </div>
  )
}

function BindingRow({ binding }: { binding: Binding }) {
  return (
    <li
      className={`border-border flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border px-2 py-1 ${fade} ${
        binding.changed ? 'bg-highlight' : 'bg-surface'
      }`}
    >
      <Badge>{binding.declaredWith}</Badge>
      <span className={`font-mono font-semibold ${wrap}`}>{binding.name}</span>
      <span>=</span>
      <span className={`min-w-0 font-mono ${wrap}`}>{formatVal(binding.value)}</span>
      <Badge>{TYPE_LABELS[binding.value.type]}</Badge>
      {binding.changed && <Badge>새로 생김</Badge>}
    </li>
  )
}

export function ConversionView({ state }: Props) {
  const operationId = useId()
  const bindingsId = useId()
  const { operation, bindings } = state

  return (
    <div className="space-y-4">
      <section aria-labelledby={operationId} className="min-w-0">
        <p id={operationId} className="text-muted mb-2 text-sm font-semibold">
          계산 중인 연산
        </p>
        {operation ? (
          <div className="border-border bg-surface rounded-lg border px-3 py-2">
            <p className={`font-mono ${wrap}`}>{operation.code}</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <OperandCard side="왼쪽" operand={operation.left} />
              <OperandCard side="오른쪽" operand={operation.right} />
            </div>
            <p className="mt-2 text-sm">
              <span className="text-muted text-xs">연산자 </span>
              <span className="font-mono">{operation.operator}</span>
              {`: ${RULE_LABELS[operation.rule]}`}
            </p>
            {operation.result && (
              <p className="border-border mt-2 border-t pt-2 font-semibold">
                <span>결과:</span>{' '}
                <span className={`font-mono ${wrap}`}>{formatVal(operation.result)}</span>{' '}
                <span>{`(${TYPE_LABELS[operation.result.type]})`}</span>
              </p>
            )}
          </div>
        ) : (
          <div className="border-border bg-surface text-muted rounded-lg border px-3 py-6 text-center">
            아직 계산 중인 연산이 없습니다.
          </div>
        )}
      </section>

      <section aria-labelledby={bindingsId} className="min-w-0">
        <p id={bindingsId} className="text-muted mb-2 text-sm font-semibold">
          변수
        </p>
        {bindings.length === 0 ? (
          <div className="border-border bg-surface text-muted rounded-lg border px-3 py-6 text-center">
            아직 표시할 변수가 없습니다.
          </div>
        ) : (
          <ul className="space-y-1">
            {bindings.map((b) => (
              <BindingRow key={b.name} binding={b} />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
