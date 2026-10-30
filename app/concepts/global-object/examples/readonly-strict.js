'use strict';
try {
  undefined = 'changed';
} catch (e) {
  console.log(e.name);
}
