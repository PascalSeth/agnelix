// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path');

const logPath = 'C:\\Users\\pasca\\.gemini\\antigravity\\brain\\f4765035-af15-4ea9-a7e2-998cf2f98f27\\.system_generated\\logs\\transcript.jsonl';
const outputPath = path.join(__dirname, 'untruncated_request.txt');

try {
  const fileContent = fs.readFileSync(logPath, 'utf8');
  // Read first line
  const firstLine = fileContent.split('\n')[0];
  const parsed = JSON.parse(firstLine);
  fs.writeFileSync(outputPath, parsed.content, 'utf8');
  console.log('Successfully wrote untruncated user request to scratch/untruncated_request.txt');
} catch (e) {
  console.error('Error:', e);
}
