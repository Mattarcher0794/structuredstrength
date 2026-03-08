import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.structuredstrength.app',
  appName: 'Structured Strength',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
    hostname: 'localhost',
    allowNavigation: ['*.supabase.co'],
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
