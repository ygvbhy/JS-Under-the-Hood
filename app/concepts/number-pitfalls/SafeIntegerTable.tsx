import { safeIntegerRows as defaultRows, type SafeIntegerRow } from './safe-integers'

type Props = {
  rows?: SafeIntegerRow[]
}

const cell = 'border-border border px-3 py-2'

export function SafeIntegerTable({ rows = defaultRows }: Props) {
  return (
    <div
      className="focus-visible:outline-accent my-6 overflow-x-auto focus-visible:outline-2"
      tabIndex={0}
      role="region"
      aria-label="2의 53제곱 근처 정수가 되는 Number 값을 정리한 표(좁은 화면에서는 가로로 스크롤할 수 있습니다)"
    >
      <table className="w-full border-collapse text-left text-sm">
        <caption className="text-muted mb-1 text-left text-sm">
          정수 리터럴이 되는 Number 값
        </caption>
        <thead>
          <tr>
            {['정수', 'Number 값', '다른 정수와 같은 값', '안전한 범위'].map((h) => (
              <th key={h} scope="col" className={`${cell} font-semibold`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const changed = row.integer !== row.numberValue
            return (
              <tr key={row.integer}>
                <td className={`${cell} font-mono`}>{row.integer}</td>
                <td className={`${cell} font-mono`}>
                  {row.numberValue}
                  {changed && <span className="font-sans"> (다른 값이 됨)</span>}
                </td>
                <td className={cell}>{row.shared ? '예' : '아니오'}</td>
                <td className={cell}>{row.safe ? '예' : '아니오'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
