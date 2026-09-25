# Publishing the Dublin Lions app to Google Play & the App Store

The native apps are thin Capacitor shells around the web build. Every time you change the web app: `yarn build && npx cap sync`, then rebuild in Android Studio / Xcode.

## Accounts you need
- **Google Play Console** — one-time US$25: https://play.google.com/console
- **Apple Developer Program** — US$99/year: https://developer.apple.com/programs/
- A Mac with Xcode is required for the iOS build.

## One-time local setup
```bash
cd app
yarn install
yarn build              # → dist/
npx cap sync            # copies dist/ + plugins into android/ and ios/
```

App identity is in `capacitor.config.ts` (`appId: ie.dublinlions.app`, `appName: Dublin Lions BC`). Change once before the first store upload — it can't be changed afterwards.

### Icons & splash
Already generated from the club crest (`app/resources/icon.png`, `icon-foreground.png`, `icon-background.png`, `splash.png`) into both native projects and `public/icons` (PWA). To regenerate after changing the crest:
```bash
npx @capacitor/assets generate --iconBackgroundColor '#070C16' --splashBackgroundColor '#070C16'
```

## Android
```bash
npx cap open android      # opens Android Studio
```
1. Add `google-services.json` (Firebase, see README §4) to `android/app/`.
2. **Build → Generate Signed Bundle** → create a keystore (keep it safe — losing it means you can never update the app) → produce an `.aab`.
3. Play Console → Create app → upload the `.aab` under *Production* (or *Internal testing* first).
4. Fill in: store listing (screenshots from a phone/emulator), **Data safety** (collects name, email, phone, payment info via Stripe; encrypted in transit; users can request deletion — the app has *Profile → Delete my account*), content rating, and the privacy policy URL `https://<your-web-url>/#/privacy`.

## iOS
```bash
npx cap open ios          # opens Xcode
```
1. Xcode → target *App* → **Signing & Capabilities** → select your team; add capabilities **Push Notifications** and **Background Modes → Remote notifications**.
2. Add `GoogleService-Info.plist` to `ios/App/App/`.
3. `ios/App/App/Info.plist` — the deep-link scheme `ie.dublinlions.app` is already registered by Capacitor. Add `NSCameraUsageDescription` / `NSPhotoLibraryUsageDescription` ("Used to set your profile photo") if you enable photo upload for members.
4. Product → **Archive** → Distribute → App Store Connect. Create the app in https://appstoreconnect.apple.com with the same bundle id, upload, add screenshots, privacy details, and submit for review.

## Payments inside the native app (store rules)
Stripe Checkout opens in the in-app browser. Apple and Google **allow** external payment processors for **physical goods and real-world services** — memberships, match tickets, merchandise, facility bookings and lotto entries all qualify — so no in-app purchase (IAP) is needed. Do not sell digital content through Stripe in the app.

## Club lotto — legal
Running a lotto for money in Ireland requires a lottery permit/licence (Gaming and Lotteries Act). Put your licence number and terms in **Admin → Settings → Lotto rules**; they show under the number picker. You can switch the feature off entirely in Settings → Features.

## Updating the app
```bash
yarn build && npx cap sync
```
then rebuild/upload in Android Studio and Xcode. Bump `version` in `package.json` (shown in *More* screen) and the version/build numbers in each native project.
