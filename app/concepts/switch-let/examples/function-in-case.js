function run(n) {
  switch (n) {
    case 0:
      console.log(typeof helper);
      break;
    case 1:
      function helper() {}
  }
  try {
    console.log(helper === undefined);
  } catch (e) {
    console.log(e.name);
  }
}
run(0);
run(1);
