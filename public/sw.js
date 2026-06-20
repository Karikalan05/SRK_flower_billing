// Minimal service worker so the app is installable on Android and the shell
// loads even on a flaky connection. Data always comes fresh from Supabase.
const CACHE = 'srk-flowers-v2'
const SHELL = ['/', '/index.html', '/logo.png', '/manifest.webmanifest']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)

  // Never cache Supabase API/auth calls — always hit the network.
  if (url.hostname.endsWith('supabase.co')) return

  // App shell + assets: cache-first, fall back to network.
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request)
          .then((res) => {
            const copy = res.clone()
            if (url.origin === self.location.origin) {
              caches.open(CACHE).then((c) => c.put(request, copy))
            }
            return res
          })
          .catch(() => caches.match('/index.html')),
    ),
  )
})
