function hide() {
  try {
    throw new Error('사라짐');
  } finally {
    return '삼킴';
  }
}
console.log(hide());
function leave() {
  while (true) {
    try {
      return 'return 값';
    } finally {
      break;
    }
  }
  return '루프 뒤';
}
console.log(leave());
function replace() {
  try {
    throw new Error('try의 예외');
  } finally {
    throw new Error('finally의 예외');
  }
}
try {
  replace();
} catch (e) {
  console.log(e.message);
}
