var city = '서울';

function outer() {
  var area = '마포';

  function inner() {
    var street = '합정';
    console.log(street + ' ' + area + ' ' + city);
  }

  inner();
}

outer();
console.log(typeof area);
