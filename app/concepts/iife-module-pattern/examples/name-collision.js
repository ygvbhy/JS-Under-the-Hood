// 라이브러리 A
var version = 'A';
function init() { return 'A 준비'; }
console.log(init());
// 라이브러리 B
var version = 'B';
function init() { return 'B 준비'; }
console.log(init(), version);
