import { useId, useState } from 'react'
import { roundingPresets as defaultPresets, type RoundingPreset } from './rounding-presets'

type Props = {
  presets?: RoundingPreset[]
}

function Candidate({
  label,
  candidate,
  distance,
  badge,
}: {
  label: string
  candidate: string
  distance: string
  badge: string | null
}) {
  return (
    <li className="border-border bg-surface rounded-md border px-3 py-2">
      <p className="text-sm">
        <span className="text-muted">{label} </span>
        <span className="font-mono font-semibold">{candidate}</span>
        {badge && (
          <span className="border-accent bg-highlight ml-2 inline-block rounded border px-2 text-xs font-semibold">
            {badge}
          </span>
        )}
      </p>
      <p className="text-muted text-sm">
        저장 값과의 거리 <span className="text-fg font-mono break-all">{distance}</span>
      </p>
    </li>
  )
}

export function RoundingView({ presets = defaultPresets }: Props) {
  const radioName = useId()
  const [selectedId, setSelectedId] = useState(presets[0].id)
  const preset = presets.find((p) => p.id === selectedId) ?? presets[0]
  const tie = preset.verdict === 'tie'
  const badgeFor = (side: 'lower' | 'upper') =>
    tie ? '정확히 가운데' : preset.verdict === side ? '더 가까움' : null

  return (
    <div
      role="region"
      aria-label="반올림 판정 보기"
      className="border-border bg-bg my-6 rounded-xl border p-3 sm:p-4"
    >
      <fieldset className="mb-3 min-w-0">
        <legend className="text-muted mb-1 text-sm">값과 자릿수</legend>
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <label key={p.id} className="relative">
              <input
                type="radio"
                name={radioName}
                value={p.id}
                checked={p.id === preset.id}
                onChange={() => setSelectedId(p.id)}
                className="peer absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
              <span className="border-border bg-surface text-fg peer-checked:border-accent peer-checked:bg-highlight peer-focus-visible:outline-accent inline-flex min-h-10 items-center rounded-md border px-3 font-mono text-sm peer-checked:font-semibold peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2">
                {p.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <p className="text-muted text-sm">부호를 뗀 저장 값(정확한 십진 표현)</p>
      <p className="mb-3 font-mono text-sm break-all">{preset.stored}</p>

      <ul className="mb-3 grid gap-2 sm:grid-cols-2">
        <Candidate
          label="아래 후보"
          candidate={preset.lower}
          distance={preset.lowerDistance}
          badge={badgeFor('lower')}
        />
        <Candidate
          label="위 후보"
          candidate={preset.upper}
          distance={preset.upperDistance}
          badge={badgeFor('upper')}
        />
      </ul>

      <p className="mb-1 font-semibold">
        결과 <span className="font-mono">{preset.result}</span>
      </p>
      <p className="text-muted text-sm">{preset.note}</p>
    </div>
  )
}
