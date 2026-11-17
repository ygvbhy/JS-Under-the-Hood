import { useId } from 'react'
import type { ArgProperty, ArgumentsState, ParamBinding } from './scenarios'

type Props = {
  state: ArgumentsState
}

const badgeClass =
  'border-border bg-surface text-fg shrink-0 rounded border px-1.5 text-xs leading-5 whitespace-nowrap'
const changedClass = 'bg-highlight'
const fade = 'motion-safe:transition-[background-color,opacity] motion-safe:duration-300'
const wrap = 'break-words'

function Badge({ children }: { children: string }) {
  return <span className={badgeClass}>{children}</span>
}

function ParamRow({ param }: { param: ParamBinding }) {
  return (
    <li
      data-param-name={param.name}
      data-changed={param.changed ? 'true' : undefined}
      className={`border-border flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border px-2 py-1 ${fade} ${
        param.changed ? changedClass : 'bg-surface'
      }`}
    >
      <span className={`font-mono font-semibold ${wrap}`}>{param.name}</span>{' '}
      <span className={wrap}>= {param.value}</span> {param.changed && <Badge>바뀜</Badge>}
    </li>
  )
}

function ArgRow({ prop }: { prop: ArgProperty }) {
  return (
    <li
      data-arg-key={prop.key}
      data-mapped-to={prop.mappedTo ?? undefined}
      data-changed={prop.changed ? 'true' : undefined}
      className={`border-border flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border px-2 py-1 ${fade} ${
        prop.changed ? changedClass : 'bg-surface'
      }`}
    >
      <span className={`font-mono font-semibold ${wrap}`}>arguments[{prop.key}]</span>{' '}
      <span className={wrap}>= {prop.value}</span>{' '}
      <Badge>{prop.mappedTo === null ? '연결 없음' : `${prop.mappedTo}와 연결`}</Badge>
      {prop.changed && <Badge>바뀜</Badge>}
    </li>
  )
}

export function ArgumentsView({ state }: Props) {
  const ctxId = useId()
  const paramsId = useId()
  const argsId = useId()
  const headingClass = 'text-muted mb-2 text-sm font-semibold'

  return (
    <div className="space-y-4">
      <section aria-labelledby={ctxId} className="min-w-0">
        <p id={ctxId} className={headingClass}>
          실행 컨텍스트
        </p>
        <div className="border-border bg-surface rounded-lg border-2 px-3 py-2">
          <p className="font-semibold">
            <span className="text-muted text-sm font-normal">실행 중인 코드:</span>{' '}
            <span className={`font-mono ${wrap}`}>{state.running}</span>
          </p>
        </div>
      </section>
      <section aria-labelledby={paramsId} className="min-w-0">
        <p id={paramsId} className={headingClass}>
          매개변수 바인딩
        </p>
        {state.params.length === 0 ? (
          <p className="text-muted text-sm">매개변수 없음(함수 호출 중이 아님)</p>
        ) : (
          <ul className="space-y-1">
            {state.params.map((p) => (
              <ParamRow key={p.name} param={p} />
            ))}
          </ul>
        )}
      </section>
      <section aria-labelledby={argsId} className="min-w-0">
        <p id={argsId} className={headingClass}>
          arguments 객체
        </p>
        {state.args === null ? (
          <p className="text-muted text-sm">arguments 객체 없음(함수 호출 중이 아님)</p>
        ) : (
          <>
            <p className="text-muted mb-2 text-xs">
              칸의 값은 그 프로퍼티를 읽었을 때 나오는 값입니다.
            </p>
            {state.args.length === 0 ? (
              <p className="text-sm">인덱스 프로퍼티 없음</p>
            ) : (
              <ul className="space-y-1">
                {state.args.map((p) => (
                  <ArgRow key={p.key} prop={p} />
                ))}
              </ul>
            )}
          </>
        )}
      </section>
    </div>
  )
}
