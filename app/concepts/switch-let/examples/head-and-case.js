let limit = 1;
function check(v) {
  try {
    switch (limit) {
      case v:
        console.log('v');
        break;
      case limit:
        console.log('limit');
        break;
      default:
        let limit = 99;
    }
  } catch (e) {
    console.log(e.name);
  }
}
check(1);
check(2);
