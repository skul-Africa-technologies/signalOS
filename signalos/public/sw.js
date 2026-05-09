const CACHE_NAME = 'signal-os-v1'
const urlsToCache = [
  '/',
  '/manifest.json',
  '/icons/logo.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        return response || fetch(event.request).then((fetchResponse) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, fetchResponse.clone())
            return fetchResponse
          })
        })
      })
      .catch(() => {
        if (event.request.headers.get('accept')?.includes('text/html')) {
          return caches.match('/')
        }
      })
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
})