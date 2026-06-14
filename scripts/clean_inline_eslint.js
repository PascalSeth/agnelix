const fs = require('fs');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory() && !file.includes('node_modules') && !file.includes('.next')) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('.');
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let lines = content.split('\n');
  let changed = false;
  
  // Remove all inline eslint-disable-next-line comments
  let newLines = lines.filter(line => !line.includes('eslint-disable-next-line'));
  
  if (newLines.length !== lines.length) {
    changed = true;
  }
  
  if (changed) {
    fs.writeFileSync(file, newLines.join('\n'));
    console.log('Cleaned ' + file);
  }
});
