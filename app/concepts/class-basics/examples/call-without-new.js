function Person() { return 'called'; }
class Member {}
console.log(Person());
try { Member(); } catch (e) { console.log(e.name); }
try { Member.call({}); } catch (e) { console.log(e.name); }
