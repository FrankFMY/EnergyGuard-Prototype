/// <reference lib="webworker" />

const CACHE_NAME = 'kastor-iot-v1';

// Assets to cache immediately on install
const PRECACHE_ASSETS = [
	'/',
	'/favicon.svg',
	'/manifest.json'
];

// Install event - cache essential assets
self.addEventListener('install', (event) => {
	event.waitUntil(
		caches.open(CACHE_NAME).then((cache) => {
			return cache.addAll(PRECACHE_ASSETS);
		})
	);
	self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches.keys().then((cacheNames) => {
			return Promise.all(
				cacheNames
					.filter((name) => name !== CACHE_NAME)
					.map((name) => caches.delete(name))
			);
		})
	);
	self.clients.claim();
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
	// Skip non-http(s) requests (e.g. chrome-extension, data, etc.)
	if (!event.request.url.startsWith('http')) return;

	// Skip non-GET requests
	if (event.request.method !== 'GET') return;

	// Skip API requests - always go to network
	if (event.request.url.includes('/api/')) return;

	event.respondWith(
		fetch(event.request)
			.then((response) => {
				// Clone the response before caching
				const responseClone = response.clone();
				caches.open(CACHE_NAME).then((cache) => {
					cache.put(event.request, responseClone);
				});
				return response;
			})
			.catch(() => {
				// Network failed, try cache
				return caches.match(event.request).then((response) => {
					if (response) return response;
					// Return offline page for navigation requests
					if (event.request.mode === 'navigate') {
						return caches.match('/');
					}
					return new Response('Offline', { status: 503 });
				});
			})
	);
});
