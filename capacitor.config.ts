import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vianmaps.app',
  appName: 'Vian Maps Tactical',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
