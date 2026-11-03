var box = document.createElement('div');
document.body.append(box);
box.innerHTML = '<script>console.log("innerHTML")</script>';
console.log(box.querySelectorAll('script').length);
var script = document.createElement('script');
script.textContent = 'console.log("createElement")';
box.append(script);
console.log('end');
