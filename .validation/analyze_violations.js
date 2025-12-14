const fs = require('fs');
const report = JSON.parse(fs.readFileSync('violation-prevention-report.json', 'utf8'));
const fileViolations = {};
const fileCategories = {};

// Iterate through all categories
Object.entries(report.categories).forEach(([categoryName, categoryData]) => {
  if (categoryData.files && Array.isArray(categoryData.files)) {
    categoryData.files.forEach(file => {
      // Count violations per file
      fileViolations[file] = (fileViolations[file] || 0) + 1;

      // Track which categories each file belongs to
      if (!fileCategories[file]) {
        fileCategories[file] = [];
      }
      fileCategories[file].push(categoryName);
    });
  }
});

const sorted = Object.entries(fileViolations)
  .sort((a,b) => b[1] - a[1])
  .slice(0, 30);

console.log('TOP 30 FILES WITH MOST VIOLATIONS:\n');
console.log('=' .repeat(80));
sorted.forEach(([file, count], i) => {
  const shortFile = file.replace(/E:\\ExAI-GOD\\/g, '').replace(/\\/g, '/');
  const categories = fileCategories[file].join(', ');
  console.log(`${i+1}. [${count}] ${shortFile}`);
  console.log(`   Categories: ${categories}\n`);
});

console.log('=' .repeat(80));
console.log(`\nTotal violations: ${report.summary.totalViolations}`);
console.log(`Files affected: ${report.summary.violatingFiles}`);
console.log(`Violation rate: ${report.summary.violationRate}`);

console.log('\n\nBREAKDOWN BY CATEGORY:');
console.log('=' .repeat(80));
Object.entries(report.categories).forEach(([name, data]) => {
  console.log(`${name.toUpperCase()}: ${data.count} violations [${data.severity}]`);
});
