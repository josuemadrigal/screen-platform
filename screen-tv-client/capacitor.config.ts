import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.screenmanager.tvclient',
  appName: 'Screen TV',
  webDir: 'dist',
  android: {
    allowMixedContent: false, // HTTPS ya configurado
    captureInput: true,
    webContentsDebuggingEnabled: true, // Quitar en producción
  },
  plugins: {
    CapacitorSQLite: {
      iosDatabaseLocation: 'Library/CapacitorDatabase',
      iosIsEncryption: false,
      androidIsEncryption: false,
    },
  },
};

export default config;
