import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.screenmanager.tvclient',
  appName: 'Screen TV',
  webDir: 'dist',
  android: {
    // Only for CAP_CLEARTEXT test builds (local HTTP API); production is HTTPS end to end.
    allowMixedContent: !!process.env.CAP_CLEARTEXT,
    captureInput: true,
    webContentsDebuggingEnabled: process.env.NODE_ENV !== 'production',
  },
  // Test builds against a local API over plain HTTP (e.g. the emulator hitting http://10.0.2.2:4006):
  //   CAP_CLEARTEXT=1 npx cap sync android
  // Production builds talk HTTPS and must not set this.
  ...(process.env.CAP_CLEARTEXT ? { server: { cleartext: true } } : {}),
  plugins: {
    CapacitorSQLite: {
      iosDatabaseLocation: 'Library/CapacitorDatabase',
      iosIsEncryption: false,
      androidIsEncryption: false,
    },
  },
};

export default config;
