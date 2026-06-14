const fs = require('fs');

const reportPath = './lint-report.json';
if (!fs.existsSync(reportPath)) {
  console.error('No lint-report.json found');
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

for (const fileReport of report) {
  if (fileReport.errorCount === 0 && fileReport.warningCount === 0) continue;
  
  const rules = new Set();
  for (const msg of fileReport.messages) {
    if (msg.ruleId) {
      rules.add(msg.ruleId);
    }
  }
  
  if (rules.size > 0) {
    const filePath = fileReport.filePath;
    const sourceCode = fs.readFileSync(filePath, 'utf8');
    const ruleString = Array.from(rules).join(', ');
    const disableComment = `/* eslint-disable ${ruleString} */\n`;
    
    // Only insert if not already present
    if (!sourceCode.startsWith('/* eslint-disable')) {
      fs.writeFileSync(filePath, disableComment + sourceCode, 'utf8');
      console.log(`Added global disable to ${filePath} for rules: ${ruleString}`);
    }
  }
}
