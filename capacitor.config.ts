import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.grupo1.rentacar',
  appName: 'RentaCar',
  webDir: 'dist',

  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
