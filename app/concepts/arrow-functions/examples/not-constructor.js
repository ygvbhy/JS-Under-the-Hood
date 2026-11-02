function normal() {}
var obj = { short() {}, old: function () {} };
var arrow = () => {};
console.log(typeof normal, typeof obj.short, typeof arrow);
console.log(typeof new normal(), typeof new obj.old());
try { new obj.short(); } catch (e) { console.log(e.name); }
try { new arrow(); } catch (e) { console.log(e.name); }
console.log(normal.hasOwnProperty('prototype'), obj.short.hasOwnProperty('prototype'), arrow.hasOwnProperty('prototype'));
