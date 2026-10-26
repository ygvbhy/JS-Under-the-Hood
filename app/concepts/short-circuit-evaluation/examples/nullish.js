const count = 0;
const title = '';
let memo;

console.log(count || 10, count ?? 10);
console.log(JSON.stringify(title || '제목 없음'), JSON.stringify(title ?? '제목 없음'));
console.log(memo ?? '메모 없음');
