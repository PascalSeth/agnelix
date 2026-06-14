const fs = require('fs');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory() && !file.includes('node_modules') && !file.includes('.next')) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx')) {
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
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^(\s*)\/\/ (eslint-disable-next-line .*)$/);
    if (match) {
      const nextLine = lines[i+1] || '';
      // If the next line starts with a tag like <img or <div or <User
      if (nextLine.trim().startsWith('<')) {
         lines[i] = match[1] + '{/* ' + match[2] + ' */}';
         changed = true;
      }
    }
    
    // Fix common unescaped entities
    if (lines[i].includes("It's ")) {
      lines[i] = lines[i].replace(/It's /g, "It&apos;s ");
      changed = true;
    }
    if (lines[i].includes("don't ")) {
      lines[i] = lines[i].replace(/don't /g, "don&apos;t ");
      changed = true;
    }
    if (lines[i].includes(' "')) {
      // Just replacing some easy quotes might break things, we'll run eslint to find out
    }
  }
  if (changed) {
    fs.writeFileSync(file, lines.join('\n'));
    console.log('Fixed JSX comments in ' + file);
  }
});
