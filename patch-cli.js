const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, 'node_modules', '@angular', 'cli', 'src', 'utilities', 'node-version.js');

if (fs.existsSync(targetPath)) {
  let content = fs.readFileSync(targetPath, 'utf8');
  if (content.includes("SUPPORTED_NODE_VERSIONS = '^22.22.3")) {
    content = content.replace(
      "SUPPORTED_NODE_VERSIONS = '^22.22.3 || ^24.15.0 || >=26.0.0'",
      "SUPPORTED_NODE_VERSIONS = '^22.16.0 || ^22.22.3 || ^24.15.0 || >=26.0.0'"
    );
    fs.writeFileSync(targetPath, content, 'utf8');
    console.log('Successfully patched Angular CLI Node.js version check.');
  } else {
    console.log('Angular CLI Node.js version check already patched or pattern not found.');
  }
} else {
  console.log('Angular CLI version check file not found.');
}
