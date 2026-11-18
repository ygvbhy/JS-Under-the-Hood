class P {
  constructor() {
    this.x = 1;
  }
}
const shared = { n: 1 };
const cyc = {};
cyc.self = cyc;
const hole = [1, , 3];

function run(f) {
  try {
    return String(f());
  } catch (e) {
    return e.name;
  }
}

const rows = [
  ['Date', new Date(0), (r) => r instanceof Date],
  ['Map', new Map([['k', 1]]), (r) => r instanceof Map],
  ['값이 undefined인 프로퍼티', { v: undefined }, (r) => "v" in r],
  ['NaN', { v: NaN }, (r) => Number.isNaN(r.v)],
  ['-0', { v: -0 }, (r) => Object.is(r.v, -0)],
  ['BigInt', { v: 10n }, (r) => typeof r.v],
  ['공유 참조', { a: shared, b: shared }, (r) => r.a === r.b],
  ['순환 참조', cyc, (r) => r.self === r],
  ['함수 값 프로퍼티', { f() {} }, (r) => "f" in r],
  ['클래스 인스턴스', new P(), (r) => r instanceof P],
  ['배열 구멍', hole, (r) => 1 in r],
  ['RegExp', /a/g, (r) => r instanceof RegExp],
];

for (const [label, x, check] of rows) {
  const viaJson = run(() => check(JSON.parse(JSON.stringify(x))));
  const viaClone = run(() => check(structuredClone(x)));
  console.log(JSON.stringify([label, viaJson, viaClone]));
}
