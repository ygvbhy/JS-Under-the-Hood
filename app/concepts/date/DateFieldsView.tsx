import { useId } from 'react'
import type { DateCalc, DateEntry, DateFieldsState, Fields } from './scenarios'

type Props = {
  state: DateFieldsState
  prevState?: DateFieldsState
}

const badgeClass =
  'border-border bg-surface text-fg shrink-0 rounded border px-1.5 text-xs leading-5 whitespace-nowrap'
const changedClass = 'bg-highlight'
const fade = 'motion-safe:transition-[background-color,opacity] motion-safe:duration-300'
const wrap = 'break-words'

function Badge({ children }: { children: string }) {
  return <span className={badgeClass}>{children}</span>
}

function Name({ children }: { children: string }) {
  return <span className={`font-mono ${wrap}`}>{children}</span>
}

const sameFields = (a: Fields, b: Fields) =>
  a.year === b.year && a.month === b.month && a.day === b.day

// month는 Date가 세는 0부터의 월이다. 사람이 읽는 월을 괄호로 함께 쓴다(예: 1 (2월)).
function fieldsText(f: Fields): string {
  return `연 ${f.year}, 월 ${f.month} (${f.month + 1}월), 일 ${f.day}`
}

function DateRow({ entry, prev }: { entry: DateEntry; prev?: DateFieldsState }) {
  const before = prev?.dates.find((d) => d.name === entry.name)
  const changed = !before || !sameFields(before.fields, entry.fields)
  return (
    <li
      data-date-name={entry.name}
      data-changed={changed ? 'true' : undefined}
      className={`border-border flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border px-2 py-1 ${fade} ${
        changed ? changedClass : 'bg-surface'
      }`}
    >
      <span className={`font-mono font-semibold ${wrap}`}>{entry.name}</span>
      <span className={wrap}>{fieldsText(entry.fields)}</span>
      {changed && <Badge>바뀜</Badge>}
    </li>
  )
}

type CalcRow = { key: string; title: string; text: string; same: boolean }

function calcRows(calc: DateCalc, prev: DateCalc | null): CalcRow[] {
  const sameFieldsOf = (a: Fields, b?: Fields) => !!b && sameFields(a, b)
  return [
    {
      key: 'input',
      title: '입력 (연, 월, 일)',
      text: fieldsText(calc.input),
      same: sameFieldsOf(calc.input, prev?.input),
    },
    {
      key: 'balanced',
      title: '맞춘 연·월 (연 + floor(월 / 12), 월 modulo 12)',
      text: `연 ${calc.balancedYear}, 월 ${calc.balancedMonth} (${calc.balancedMonth + 1}월)`,
      same: prev?.balancedYear === calc.balancedYear && prev?.balancedMonth === calc.balancedMonth,
    },
    {
      key: 'first',
      title: '그 달의 1일',
      text: fieldsText(calc.firstOfMonth),
      same: sameFieldsOf(calc.firstOfMonth, prev?.firstOfMonth),
    },
    {
      key: 'add',
      title: '더할 날수 (일 - 1)',
      text: `${calc.addDays >= 0 ? '+' : '-'}${Math.abs(calc.addDays)}일`,
      same: prev?.addDays === calc.addDays,
    },
    {
      key: 'result',
      title: '결과',
      text: fieldsText(calc.result),
      same: sameFieldsOf(calc.result, prev?.result),
    },
  ]
}

function CalcBox({ calc, prev }: { calc: DateCalc; prev: DateCalc | null }) {
  const rows = calcRows(calc, prev)
  return (
    <div className="space-y-2">
      <p className="font-semibold">
        <Name>{calc.label}</Name>
      </p>
      <ol className="space-y-1">
        {rows.map((row, i) => (
          <li
            key={row.key}
            data-calc-row={row.key}
            data-changed={row.same ? undefined : 'true'}
            className={`border-border rounded-md border px-2 py-1 ${fade} ${
              row.same ? 'bg-surface' : changedClass
            }`}
          >
            <p className="text-muted text-xs">
              {i + 1}. {row.title}
            </p>
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className={wrap}>{row.text}</span>
              {!row.same && <Badge>바뀜</Badge>}
            </p>
          </li>
        ))}
      </ol>
    </div>
  )
}

export function DateFieldsView({ state, prevState }: Props) {
  const datesId = useId()
  const calcId = useId()
  const headingClass = 'text-muted mb-2 text-sm font-semibold'

  return (
    <div className="space-y-4">
      <section aria-labelledby={datesId} className="min-w-0">
        <p id={datesId} className={headingClass}>
          변수가 가리키는 Date (로컬 필드)
        </p>
        {state.dates.length === 0 ? (
          <p className="text-muted text-sm">아직 Date를 가리키는 변수가 없습니다.</p>
        ) : (
          <ul className="space-y-1">
            {state.dates.map((d) => (
              <DateRow key={d.name} entry={d} prev={prevState} />
            ))}
          </ul>
        )}
      </section>
      <section aria-labelledby={calcId} className="min-w-0">
        <p id={calcId} className={headingClass}>
          MakeDay 계산
        </p>
        {state.calc ? (
          <CalcBox calc={state.calc} prev={prevState?.calc ?? null} />
        ) : (
          <p className="text-muted text-sm">이 단계에서 진행 중인 MakeDay 계산 없음</p>
        )}
      </section>
    </div>
  )
}
