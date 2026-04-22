const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname);
const destDir = path.join(rootDir, 'www');
const itemsToCopy = [
  'index.html',
  'manifest.json',
  'service-worker.js',
  'script.js',
  'style.css',
  'icons'
];

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    for (const child of fs.readdirSync(src)) {
      copyRecursive(path.join(src, child), path.join(dest, child));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

if (fs.existsSync(destDir)) {
  fs.rmSync(destDir, { recursive: true, force: true });
}
fs.mkdirSync(destDir, { recursive: true });

for (const item of itemsToCopy) {
  const srcPath = path.join(rootDir, item);
  const destPath = path.join(destDir, item);
  if (!fs.existsSync(srcPath)) {
    console.warn(`Skipping missing item: ${item}`);
    continue;
  }
  copyRecursive(srcPath, destPath);
}

console.log('Web assets copied into build directory:', destDir);
console.log('Now run `npx cap sync android` and open the Android project in Android Studio.');
