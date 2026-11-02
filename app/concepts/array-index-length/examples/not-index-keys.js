var list = [];
list[-1] = 'minus';
list['01'] = 'zero-one';
list[1.5] = 'half';
list[4294967295] = 'too big';
console.log(list.length, JSON.stringify(Object.keys(list)));
list[4294967294] = 'last';
console.log(list.length);
