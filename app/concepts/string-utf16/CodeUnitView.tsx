import { useId, useState } from 'react'
import {
  formatCodePoint,
  formatUnit,
  isLoneKind,
  kindLabels,
  names,
  samples as defaultSamples,
  toCodePoints,
  toUnits,
  type CodePoint,
  type Sample,
} from './units'

type Props = {
  samples?: Sample[]
}

function glyphText(point: CodePoint, lone: boolean): string {
  if (lone) return '(그릴 수 없음)'
  return names[point.codePoint] ?? String.fromCodePoint(point.codePoint)
}

export function CodeUnitView({ samples = defaultSamples }: Props) {
  const radioName = useId()
  const [selectedId, setSelectedId] = useState(samples[0].id)
  const sample = samples.find((s) => s.id === selectedId) ?? samples[0]
  const units = toUnits(sample.value)
  const points = toCodePoints(sample.value)
  const pointAt = new Map(points.map((p) => [p.start, p]))

  return (
    <div
      role="region"
      aria-label="코드 유닛 보기"
      className="border-border bg-bg my-6 rounded-xl border p-3 sm:p-4"
    >
      <fieldset className="mb-3 min-w-0">
        <legend className="text-muted mb-1 text-sm">문자열</legend>
        <div className="flex flex-wrap gap-2">
          {samples.map((s) => (
            <label key={s.id} className="relative">
              <input
                type="radio"
                name={radioName}
                value={s.id}
                checked={s.id === sample.id}
                onChange={() => setSelectedId(s.id)}
                className="peer absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
              <span className="border-border bg-surface text-fg peer-checked:border-accent peer-checked:bg-highlight peer-focus-visible:outline-accent inline-flex min-h-10 items-center rounded-md border px-3 peer-checked:font-semibold peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2">
                {s.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <p className="mb-1 font-semibold">{`length ${units.length} · 코드 포인트 ${points.length}개`}</p>
      <p className="text-muted mb-3 text-sm">{sample.note}</p>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <caption className="text-muted mb-1 text-left text-sm">{`'${sample.label}'의 코드 유닛`}</caption>
          <thead>
            <tr>
              {['인덱스', '코드 유닛', '종류', '코드 포인트', '글자'].map((h) => (
                <th key={h} scope="col" className="border-border border-b px-2 py-1 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {units.map((u) => {
              const point = pointAt.get(u.index)
              const lone = isLoneKind(u.kind)
              return (
                <tr key={u.index} className={u.kind === 'single' ? '' : 'bg-highlight'}>
                  <td className="border-border border-b px-2 py-1 font-mono">{u.index}</td>
                  <td className="border-border border-b px-2 py-1 font-mono">
                    {formatUnit(u.unit)}
                  </td>
                  <td className="border-border border-b px-2 py-1">{kindLabels[u.kind]}</td>
                  {point && (
                    <>
                      <td
                        rowSpan={point.size}
                        className="border-border border-b px-2 py-1 font-mono"
                      >
                        {formatCodePoint(point.codePoint)}
                      </td>
                      <td rowSpan={point.size} className="border-border border-b px-2 py-1">
                        {glyphText(point, lone)}
                      </td>
                    </>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
