import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'ie.dublinlions.app',
  appName: 'Dublin Lions BC',
  webDir: 'dist',
  backgroundColor: '#070C16',
  android: {
    allowMixedContent: false,
    backgroundColor: '#070C16',
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#070C16',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#070C16',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#070C16',
    },
  },
}

export default config
