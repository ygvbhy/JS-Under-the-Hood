var log = [];
var o = {
  valueOf() {
    log.push('valueOf');
    return 1;
  },
  toString() {
    log.push('toString');
    return 'two';
  },
};
console.log(JSON.stringify(o + ''), log.join(','));
log = [];
console.log(JSON.stringify(`${o}`), log.join(','));
