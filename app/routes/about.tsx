import { buildMeta } from '~/lib/seo'
import { SITE_NAME } from '~/lib/site'

export function meta() {
  return buildMeta({
    title: '소개',
    description: `${SITE_NAME}의 목적과 사용 방법, 콘텐츠의 정확성·단순화 정책을 설명합니다.`,
    path: '/about',
  })
}

export default function About() {
  return (
    <article className="space-y-10">
      <h1 className="text-3xl font-bold">소개</h1>

      <section aria-labelledby="about-purpose" className="space-y-3">
        <h2 id="about-purpose" className="text-2xl font-bold">
          프로젝트 소개
        </h2>
        <p>
          {SITE_NAME}는 자바스크립트 코드가 왜 그렇게 동작하는지를 눈으로 확인하며 이해하도록 돕는
          한국어 학습 사이트입니다. 개념 하나마다 독립된 페이지가 있고, 학습이 진행되는 순서에 맞춰
          개념을 하나씩 추가합니다.
        </p>
        <p>결과만 외우지 않고 “왜 그런 결과가 나오는지”를 설명할 수 있게 되는 것이 목표입니다.</p>
      </section>

      <section aria-labelledby="about-usage" className="space-y-3">
        <h2 id="about-usage" className="text-2xl font-bold">
          사용 방법
        </h2>
        <ol className="list-decimal space-y-2 pl-6">
          <li>홈에서 개념을 고르거나 검색합니다. 제목, 요약, 태그로 찾을 수 있습니다.</li>
          <li>예제 코드를 읽고 어떤 결과가 나올지 먼저 예측합니다.</li>
          <li>시뮬레이션을 한 단계씩 따라가며 값과 변수가 어떻게 바뀌는지 확인합니다.</li>
          <li>설명을 읽고 그렇게 동작하는 이유를 정리합니다.</li>
        </ol>
      </section>

      <section aria-labelledby="accuracy" className="space-y-3">
        <h2 id="accuracy" className="scroll-mt-4 text-2xl font-bold">
          정확성과 단순화 정책
        </h2>
        <ul className="list-disc space-y-3 pl-6">
          <li>
            <strong>근거:</strong> 설명은 ECMAScript 명세와 실제 실행 결과를 기준으로 작성합니다.
            확실하지 않은 동작은 사실처럼 쓰지 않습니다.
          </li>
          <li>
            <strong>언어와 호스트의 구분:</strong> ECMAScript 언어가 정의하는 동작과 브라우저·Node
            같은 호스트가 제공하는 동작을 구분해서 설명합니다. 예를 들어 <code>console</code>은
            호스트 API이므로 출력 형식이 환경마다 다를 수 있습니다.
          </li>
          <li>
            <strong>예제 검증:</strong> 예제는 일반 스크립트(비엄격 모드)를 기준으로 하며, 페이지에
            적힌 실행 결과는 Node에서 실제로 실행해 검증합니다.
          </li>
          <li>
            <strong>단순화:</strong> 시각화는 이해를 돕기 위한 교육용 모델이며 자바스크립트 엔진의
            내부 구현이 아닙니다. 각 개념 페이지에는 단순화한 부분을 명시합니다.
          </li>
          <li>
            <strong>검토 상태:</strong> 각 개념 페이지에는 검토 상태가 표시됩니다. 검토를 마친
            페이지는 검토일을, 아직 마치지 않은 페이지는 “검토 중”을 보여 줍니다.
          </li>
        </ul>
      </section>
    </article>
  )
}
