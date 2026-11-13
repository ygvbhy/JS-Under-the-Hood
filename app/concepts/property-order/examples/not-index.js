const keys = {};
keys['10'] = 'a';
keys['9'] = 'b';
keys['01'] = 'c';
keys['1.5'] = 'd';
keys['-1'] = 'e';
keys['4294967295'] = 'f';
keys['4294967294'] = 'g';
console.log(JSON.stringify(Object.keys(keys)));
