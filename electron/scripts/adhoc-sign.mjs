/**
 * electron-builder afterPack hook — ad-hoc code signing for macOS.
 *
 * We have no Apple Developer ID certificate ($99/yr), so electron-builder skips
 * signing entirely. That is fine on Intel Macs, but FATAL on Apple Silicon:
 * arm64 macOS refuses to load a binary carrying no signature at all, and Finder
 * surfaces that failure as the misleading
 *
 *     "tapdot is damaged and can't be opened. You should move it to the Trash."
 *
 * Nothing is corrupt — and unlike the "unidentified developer" warning, the user
 * cannot right-click-Open past it. An ad-hoc signature (`codesign --sign -`)
 * satisfies the load-time check without any certificate, downgrading the hard
 * failure to the normal, bypassable Gatekeeper prompt.
 *
 * This runs only on darwin, and hard-fails the build if the resulting signature
 * doesn't verify — a silently unsigned .dmg is exactly the bug this exists to
 * prevent from shipping again.
 */

import { execFileSync } from 'node:child_process';
import path from 'node:path';

export default async function adhocSign(context) {
  const { electronPlatformName, appOutDir, packager } = context;
  if (electronPlatformName !== 'darwin') return;

  const appName = packager.appInfo.productFilename;
  const appPath = path.join(appOutDir, `${appName}.app`);

  console.log(`  • ad-hoc signing (no Developer ID certificate)  app=${appPath}`);

  // --deep signs the nested Electron Framework, helper apps and dylibs too;
  // every Mach-O inside the bundle needs a signature, not just the outer app.
  execFileSync('codesign', ['--force', '--deep', '--sign', '-', appPath], {
    stdio: 'inherit',
  });

  // Verify, and fail loudly rather than publishing another "damaged" build.
  execFileSync('codesign', ['--verify', '--deep', '--strict', '--verbose=2', appPath], {
    stdio: 'inherit',
  });

  console.log('  • ad-hoc signature verified');
}
