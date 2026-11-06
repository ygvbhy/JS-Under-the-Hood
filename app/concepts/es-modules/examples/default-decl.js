export default function f() {
  return 'f';
}
export function swap() {
  f = () => 'g';
}
