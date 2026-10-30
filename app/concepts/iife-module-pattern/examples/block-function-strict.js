'use strict';
console.log(typeof helper, 'helper' in globalThis);
{
  function helper() { return 'help'; }
}
console.log(typeof helper);
