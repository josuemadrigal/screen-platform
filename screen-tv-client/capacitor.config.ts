import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.screenmanager.tvclient',
  appName: '2B Screen',
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
    // Live updates are driven by src/hooks/useLiveUpdate.ts against our own server.
    CapacitorUpdater: {
      autoUpdate: false,
      resetWhenUpdate: true,
      appReadyTimeout: 15000,
      // No Capgo cloud: our server publishes the bundles, and no usage stats are sent anywhere.
      updateUrl: '',
      statsUrl: '',
      channelUrl: '',
    },
    CapacitorSQLite: {
      iosDatabaseLocation: 'Library/CapacitorDatabase',
      iosIsEncryption: false,
      androidIsEncryption: false,
    },
  },
};

export default config;
