let level = 'none';
function setLevel(n) {
  switch (n) {
    case 0:
      let level = 'low';
      console.log(level);
      break;
    case 1:
      try {
        level = 'high';
        console.log(level);
      } catch (e) {
        console.log(e.name);
      }
  }
}
setLevel(0);
setLevel(1);
console.log(level);
