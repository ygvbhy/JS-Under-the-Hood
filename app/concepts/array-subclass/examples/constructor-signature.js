class TodoList extends Array {
  constructor(name) {
    super();
    this.name = name;
  }
}
const todos = new TodoList('work');
todos.push('a', 'b', 'c');
console.log(todos.name);
console.log(todos.map((x) => x.toUpperCase()).name);
const rest = todos.filter((x) => x !== 'b');
console.log(rest.name);
console.log(JSON.stringify(rest), rest.length);
console.log(todos.slice(1).name);
