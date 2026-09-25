import { Capacitor } from '@capacitor/core'
import { supabase } from './supabase'

export const isNative = Capacitor.isNativePlatform()
export const platform = Capacitor.getPlatform() as 'ios' | 'android' | 'web'

/** Public https origin of the hosted web build (used for Stripe return URLs on native). */
export function publicSiteOrigin(): string {
  const configured = (import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined)?.replace(/\/$/, '')
  if (isNative && configured) return configured
  return window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '')
}

/** Open an external URL: in-app browser on native, same-tab navigation on web. */
export async function openExternal(url: string): Promise<void> {
  if (isNative) {
    const { Browser } = await import('@capacitor/browser')
    await Browser.open({ url, presentationStyle: 'popover' })
    return
  }
  window.location.href = url
}

export async function closeInAppBrowser(): Promise<void> {
  if (!isNative) return
  const { Browser } = await import('@capacitor/browser')
  await Browser.close().catch(() => {})
}

let pushRegisteredFor: string | null = null

/** Register for push notifications and store the device token against the user. */
export async function registerPushForUser(userId: string): Promise<void> {
  if (!isNative || !supabase || pushRegisteredFor === userId) return
  pushRegisteredFor = userId
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')
    let perm = await PushNotifications.checkPermissions()
    if (perm.receive === 'prompt') perm = await PushNotifications.requestPermissions()
    if (perm.receive !== 'granted') return
    await PushNotifications.addListener('registration', async ({ value }) => {
      await supabase!.from('push_tokens').upsert({ token: value, profile_id: userId, platform, updated_at: new Date().toISOString() })
    })
    await PushNotifications.addListener('pushNotificationActionPerformed', ({ notification }) => {
      const link = (notification.data as { link?: string } | undefined)?.link
      if (link) window.location.hash = link.startsWith('#') ? link : `#${link}`
    })
    await PushNotifications.register()
  } catch (e) {
    console.warn('push registration failed', e)
  }
}

export async function initNativeShell(): Promise<void> {
  if (!isNative) return
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar')
    await StatusBar.setStyle({ style: Style.Dark })
    if (platform === 'android') await StatusBar.setBackgroundColor({ color: '#0A0A0C' })
  } catch { /* plugin not available */ }
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen')
    await SplashScreen.hide()
  } catch { /* ignore */ }
  try {
    const { App } = await import('@capacitor/app')
    App.addListener('appUrlOpen', ({ url }) => {
      const hashIndex = url.indexOf('#')
      if (hashIndex >= 0) window.location.hash = url.slice(hashIndex)
    })
    App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) window.history.back()
      else App.exitApp()
    })
  } catch { /* ignore */ }
}
