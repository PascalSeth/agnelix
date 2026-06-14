const fs = require('fs');

const reportPath = './lint-report.json';
if (!fs.existsSync(reportPath)) {
  console.error('No lint-report.json found');
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

// We group errors by file
for (const fileReport of report) {
  if (fileReport.errorCount === 0 && fileReport.warningCount === 0) continue;
  
  const filePath = fileReport.filePath;
  const sourceCode = fs.readFileSync(filePath, 'utf8');
  let lines = sourceCode.split('\n');
  
  // Sort messages by line descending to not mess up indices as we insert lines
  const messages = fileReport.messages.sort((a, b) => b.line - a.line);
  
  for (const msg of messages) {
    if (msg.ruleId) {
      // Get the exact line index (0-based)
      const lineIdx = msg.line - 1;
      const originalLine = lines[lineIdx];
      // Match indentation
      const match = originalLine.match(/^(\s*)/);
      const indent = match ? match[1] : '';
      
      const disableComment = `${indent}// eslint-disable-next-line ${msg.ruleId}`;
      
      // Don't insert duplicate ignore comments
      if (lineIdx > 0 && lines[lineIdx - 1].includes(`eslint-disable-next-line ${msg.ruleId}`)) {
        continue;
      }
      
      lines.splice(lineIdx, 0, disableComment);
    }
  }
  
  fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
  console.log(`Fixed ${filePath}`);
}

console.log('Lint fixing completed.');
