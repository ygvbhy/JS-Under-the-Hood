for (let n = 1; n <= 3; n++) {
  switch (n) {
    case 1:
      console.log('하나');
      break;
    case 2:
      console.log('둘');
      continue;
  }
  console.log(n + '번 끝');
}
