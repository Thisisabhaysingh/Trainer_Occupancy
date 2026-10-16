const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const targets = [
  'server.js',
  'config',
  'middleware',
  'models',
  'routes',
  'scripts',
  'services',
];

const files = [];

const collectJavaScriptFiles = (target) => {
  const absolutePath = path.join(root, target);
  if (!fs.existsSync(absolutePath)) return;

  const stat = fs.statSync(absolutePath);
  if (stat.isFile()) {
    if (absolutePath.endsWith('.js')) files.push(absolutePath);
    return;
  }

  for (const entry of fs.readdirSync(absolutePath, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue;
    const relativePath = path.join(target, entry.name);
    if (entry.isDirectory()) collectJavaScriptFiles(relativePath);
    else if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(path.join(root, relativePath));
    }
  }
};

targets.forEach(collectJavaScriptFiles);

for (const file of files.sort()) {
  const result = spawnSync(process.execPath, ['--check', file], {
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    process.stderr.write(result.stderr || result.stdout);
    process.exit(result.status || 1);
  }
}

console.log(`Backend syntax check passed for ${files.length} JavaScript files.`);
