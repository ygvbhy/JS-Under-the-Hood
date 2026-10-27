import { useId } from 'react'
import type { Binding, Comparison, EqState, Round, Rule, Val } from './scenarios'

type Props = {
  state: EqState
}

const TYPE_LABELS: Record<Val['type'], string> = {
  string: '문자열',
  number: '숫자',
  boolean: '불리언',
  null: 'null',
  undefined: 'undefined',
}

const RULE_LABELS: Record<Rule, string> = {
  'same-type': '타입이 같으므로 ===와 같은 방법으로 값을 비교',
  'null-undefined': 'null과 undefined이므로 true',
  'string-to-number': '숫자와 문자열이므로 문자열을 숫자로 바꿔 다시 비교',
  'boolean-to-number': '한쪽이 불리언이므로 불리언을 숫자로 바꿔 다시 비교',
  'no-rule': '해당하는 변환 규칙이 없으므로 false',
  'strict-type-differs': '===는 타입이 다르면 값을 바꾸지 않고 false',
}

const OPERATOR_LABELS: Record<Comparison['operator'], string> = {
  '==': '== 느슨한 비교',
  '===': '=== 일치 비교',
}

const SIDE_LABELS = { left: '왼쪽', right: '오른쪽' } as const

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

function ValueWithType({ value }: { value: Val }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-x-1 gap-y-1">
      <span className={`min-w-0 font-mono ${wrap}`}>{formatVal(value)}</span>
      <Badge>{TYPE_LABELS[value.type]}</Badge>
    </span>
  )
}

function RoundItem({ index, round, operator }: { index: number; round: Round; operator: string }) {
  const { converted } = round
  return (
    <li className={`border-border bg-surface min-w-0 rounded-md border px-2 py-1 ${fade}`}>
      <p className="text-muted text-xs">{`라운드 ${index + 1}`}</p>
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <ValueWithType value={round.left} />
        <span className="font-mono font-semibold">{operator}</span>
        <ValueWithType value={round.right} />
      </p>
      <p className={`text-sm ${wrap}`}>{RULE_LABELS[round.rule]}</p>
      {converted && (
        <p className={`mt-1 text-sm font-semibold ${wrap}`}>
          {`→ ${SIDE_LABELS[converted.side]} 값을 숫자로: `}
          <span className="font-mono">
            {`${formatVal(round[converted.side])} → ${formatVal(converted.to)}`}
          </span>
          {` (${converted.via})`}
        </p>
      )}
    </li>
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

export function ComparisonView({ state }: Props) {
  const comparisonId = useId()
  const bindingsId = useId()
  const { comparison, bindings } = state

  return (
    <div className="space-y-4">
      <section aria-labelledby={comparisonId} className="min-w-0">
        <p id={comparisonId} className="text-muted mb-2 text-sm font-semibold">
          비교 중인 식
        </p>
        {comparison ? (
          <div className="border-border bg-surface rounded-lg border px-3 py-2">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <p className={`min-w-0 font-mono ${wrap}`}>{comparison.code}</p>
              <Badge>{OPERATOR_LABELS[comparison.operator]}</Badge>
            </div>
            <ol className="mt-2 space-y-2">
              {comparison.rounds.map((r, i) => (
                <RoundItem key={i} index={i} round={r} operator={comparison.operator} />
              ))}
            </ol>
            {comparison.result && (
              <p className="border-border mt-2 border-t pt-2 font-semibold">
                <span>결과:</span>{' '}
                <span className={`font-mono ${wrap}`}>{formatVal(comparison.result)}</span>{' '}
                <span>{`(${TYPE_LABELS[comparison.result.type]})`}</span>
              </p>
            )}
          </div>
        ) : (
          <div className="border-border bg-surface text-muted rounded-lg border px-3 py-6 text-center">
            아직 비교 중인 식이 없습니다.
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
