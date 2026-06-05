const fs = require('fs');
const html = fs.readFileSync('bing_result.html', 'utf8');
if (html.includes('No results found for')) {
  console.log('No results found message present');
} else {
  console.log('No "No results found" message.');
}
console.log('Text content (first 2000 chars):');
console.log(html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 2000));
