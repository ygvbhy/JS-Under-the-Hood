var level = '전역';

function show() {
  console.log(level);
}

function run() {
  var level = 'run 안';
  show();
}

run();
