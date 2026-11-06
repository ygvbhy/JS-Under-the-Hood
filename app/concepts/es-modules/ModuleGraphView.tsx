import type { LocalBinding, ModuleCard, ModuleState, Phase } from './scenarios'

type Props = {
  state: ModuleState
  // 바로 이전 단계의 상태. 값이 달라진 local 바인딩에 "(바뀜)"을 붙인다.
  prevState?: ModuleState
}

const fade = 'motion-safe:transition-[background-color,opacity] motion-safe:duration-300'
const wrap = 'break-words [overflow-wrap:anywhere]'

const PHASES: Phase[] = ['로드', '링크', '평가']
const UNINITIALIZED = '초기화 전'

// import 바인딩을 from·target으로 따라가 대상 local 바인딩의 값을 구한다. 초기화 전이면 null
function resolve(state: ModuleState, file: string, name: string): string | null {
  const binding = state.modules.find((m) => m.file === file)?.bindings.find((b) => b.name === name)
  if (!binding) return null
  return binding.kind === 'local' ? binding.value : resolve(state, binding.from, binding.target)
}

const prevLocal = (prev: ModuleState | undefined, file: string, name: string) =>
  prev?.modules.find((m) => m.file === file)?.bindings.find((b) => b.name === name)

function Binding({
  state,
  prevState,
  module,
  binding,
}: {
  state: ModuleState
  prevState?: ModuleState
  module: ModuleCard
  binding: ModuleCard['bindings'][number]
}) {
  const itemBase = `min-w-0 rounded border-2 px-2 py-1 font-mono text-sm ${wrap} ${fade}`
  if (binding.kind === 'import') {
    const value = resolve(state, binding.from, binding.target)
    return (
      <li data-item={binding.name} className={`${itemBase} border-border bg-surface border-dashed`}>
        <span>{binding.name}</span>
        <span> → {`${binding.from}의 ${binding.target}`}</span>
        <span className="block text-xs">{`지금 값: ${value ?? UNINITIALIZED}`}</span>
      </li>
    )
  }
  const before = prevLocal(prevState, module.file, binding.name) as LocalBinding | undefined
  const changed = !!prevState && (!before || before.value !== binding.value)
  return (
    <li
      data-item={binding.name}
      className={`${itemBase} border-border ${changed ? 'bg-highlight' : 'bg-surface'}`}
    >
      <span>{`${binding.name} = ${binding.value ?? UNINITIALIZED}`}</span>
      {changed && <span className="ml-1 text-xs font-normal">(바뀜)</span>}
    </li>
  )
}

export function ModuleGraphView({ state, prevState }: Props) {
  const { phase, modules, running } = state

  return (
    <div className="space-y-2">
      <ol aria-label="모듈 처리 단계" className="flex flex-wrap gap-1">
        {PHASES.map((p) => {
          const current = p === phase
          return (
            <li
              key={p}
              data-phase={p}
              className={`min-w-0 rounded border-2 px-2 py-1 text-sm ${fade} ${current ? 'border-accent bg-highlight font-semibold' : 'border-border bg-surface text-muted'}`}
            >
              {p}
              {current && <span className="ml-1 text-xs font-normal">(현재 단계)</span>}
            </li>
          )
        })}
      </ol>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {modules.map((m) => (
          <section
            key={m.file}
            aria-label={`모듈 ${m.file}`}
            className={`border-border bg-surface min-w-0 rounded-lg border p-2 ${fade}`}
          >
            <p className={`text-sm font-semibold ${wrap}`}>{m.file}</p>
            <p className="text-muted mb-1 text-xs">{`상태: ${m.status}`}</p>
            <ul aria-label={`${m.file}의 바인딩`} className="space-y-1">
              {m.bindings.length === 0 ? (
                <li className="text-muted text-sm">바인딩 없음</li>
              ) : (
                m.bindings.map((b) => (
                  <Binding
                    key={b.name}
                    state={state}
                    prevState={prevState}
                    module={m}
                    binding={b}
                  />
                ))
              )}
            </ul>
          </section>
        ))}
      </div>
      {running && (
        <p
          aria-label="지금 실행 중인 코드"
          className={`border-accent bg-highlight min-w-0 rounded border-2 px-2 py-1 text-sm ${wrap} ${fade}`}
        >
          <span className="block text-xs">{`${running.file}에서 실행 중`}</span>
          <code className="font-mono">{running.code}</code>
        </p>
      )}
    </div>
  )
}
