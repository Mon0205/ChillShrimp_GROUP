import type { CapacitorConfig } from '@capacitor/cli'

// The app loads the deployed site (Vercel) instead of the bundled dist/ files.
// Reason: Neon Auth sets its session cookie with the Secure flag and the API is reached through
// the site's own /api rewrite, so the cookie stays first-party only when the page itself is
// served from that HTTPS domain. A bundled app (https://localhost) would make it cross-site.
// Set it before syncing:  $env:CAP_SERVER_URL="https://<project>.vercel.app"; npm run mobile:sync
const serverUrl = process.env.CAP_SERVER_URL?.trim().replace(/\/$/, '')

if (serverUrl && !serverUrl.startsWith('https://')) {
  throw new Error('CAP_SERVER_URL phải là địa chỉ https:// vì cookie đăng nhập có cờ Secure.')
}

const config: CapacitorConfig = {
  appId: 'com.chillshrimp.app',
  appName: 'ChillShrimp',
  webDir: 'dist',
  ...(serverUrl ? { server: { url: serverUrl } } : {}),
}

export default config
