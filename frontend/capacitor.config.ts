import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.musicplayer.app',
  appName: 'Music Player',
  webDir: 'out',
  server: {
    androidScheme: 'http'
  }
};

export default config;
