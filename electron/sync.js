// Copies the web app into electron/app so the desktop build always ships the same files as the website.
const fs = require('fs'), path = require('path');
const src = path.join(__dirname, '..'), dst = path.join(__dirname, 'app');
fs.mkdirSync(dst, { recursive: true });
for (const f of ['index.html', 'manifest.webmanifest', 'sw.js', 'icon.svg', 'icon-192.png', 'icon-512.png']) {
  fs.copyFileSync(path.join(src, f), path.join(dst, f));
}
console.log('synced web app into electron/app');
