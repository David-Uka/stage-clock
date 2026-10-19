// electron-builder hook. Without an Apple Developer ID certificate the app ships unsigned, and an
// unsigned app downloaded from the internet fails on Apple Silicon with "damaged and can't be opened".
// Ad-hoc signing gives it a valid signature, so users get the normal "unverified developer" dialog
// and can open it with right-click → Open or System Settings → Privacy & Security → Open Anyway.
// When a real certificate is configured (CSC_LINK / CSC_NAME), electron-builder signs and this does nothing.
const { execSync } = require('child_process');
const path = require('path');
exports.default = async function afterSign(context) {
  if (context.electronPlatformName !== 'darwin') return;
  if (process.env.CSC_LINK || process.env.CSC_NAME) return;
  const app = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`);
  execSync(`codesign --force --deep --sign - "${app}"`, { stdio: 'inherit' });
  execSync(`codesign --verify --deep --strict "${app}"`, { stdio: 'inherit' });
  console.log('  • ad-hoc signed', app);
};
