const label = 'global';
function show() {
  return label;
}
function run() {
  const label = 'run';
  return show();
}
console.log(run());
