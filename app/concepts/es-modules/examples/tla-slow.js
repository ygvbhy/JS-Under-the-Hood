console.log('slow 시작');
export const value = await Promise.resolve('준비됨');
console.log('slow 끝');
