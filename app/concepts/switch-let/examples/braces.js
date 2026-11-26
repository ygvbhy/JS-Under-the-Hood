let word = 'outer';
function pick(n) {
  switch (n) {
    case 0: {
      let word = 'zero';
      console.log(word);
    }
    case 1: {
      let word = 'one';
      console.log(word);
      break;
    }
    case 2: {
      console.log(word);
    }
  }
}
pick(0);
pick(1);
pick(2);
