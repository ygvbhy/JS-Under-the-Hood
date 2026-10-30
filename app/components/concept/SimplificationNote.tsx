export function SimplificationNote({ simplifications }: { simplifications: string[] }) {
  return (
    <section aria-labelledby="concept-simplifications">
      <h2 id="concept-simplifications" className="mt-10 mb-3 text-xl font-bold">
        이 글에서 단순화한 부분
      </h2>
      <ul className="list-disc space-y-2 pl-6">
        {simplifications.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
    </section>
  )
}
