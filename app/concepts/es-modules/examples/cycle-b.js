import { value, hello } from './cycle-a.js';
console.log('b 본문', hello());
try {
  console.log(value);
} catch (e) {
  console.log(e.name);
}
export const fromB = 'b의 값';
