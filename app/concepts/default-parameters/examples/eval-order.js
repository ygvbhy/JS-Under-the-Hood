function note(label) {
  console.log(label);
  return label;
}
function run(a, b = note('b 기본값'), c = note('c 기본값')) {
  console.log('본문 시작');
}
run(note('인수 a'));
