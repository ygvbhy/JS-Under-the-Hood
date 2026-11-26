function walk(n) {
  switch (n) {
    case 0:
      let step = 'A';
    case 1:
      try {
        console.log(step);
      } catch (e) {
        console.log(e.name);
      }
  }
}
walk(0);
walk(1);
