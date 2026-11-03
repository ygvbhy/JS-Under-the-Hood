function walk(node, depth) {
  var label = node.nodeName;
  if (node.nodeType === Node.TEXT_NODE || node.nodeType === Node.COMMENT_NODE) {
    label += ' ' + JSON.stringify(node.nodeValue);
  }
  console.log('  '.repeat(depth) + label);
  for (var i = 0; i < node.childNodes.length; i++) {
    walk(node.childNodes[i], depth + 1);
  }
}
walk(document, 0);
