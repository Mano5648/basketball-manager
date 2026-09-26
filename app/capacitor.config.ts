import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'ie.dublinlions.app',
  appName: 'Dublin Lions',
  webDir: 'dist',
  backgroundColor: '#0A0A0C',
  android: {
    allowMixedContent: false,
    backgroundColor: '#0A0A0C',
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#0A0A0C',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#0A0A0C',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0A0A0C',
    },
  },
}

export default config
