import { fromB } from './cycle-b.js';
export let value = 'a의 값';
export function hello() {
  return 'hello';
}
console.log('a 본문', fromB);
