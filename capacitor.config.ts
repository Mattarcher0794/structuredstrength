import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.structuredstrength.app',
  appName: 'Structured Strength',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
