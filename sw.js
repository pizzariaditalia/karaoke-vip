const CACHE_NAME = 'karaoke-vip-v3';
const urlsToCache = [
    './',
    './index.html',
    './css/style.css',
    './js/app.js',
    './js/data.js',
    './image/icon.png'
];

// Instala o Service Worker e guarda os arquivos em cache
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Cache aberto');
                return cache.addAll(urlsToCache);
            })
    );
});

// Intercepta as requisições para funcionar mais rápido
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response; // Se tem no cache, usa do cache
                }
                return fetch(event.request); // Se não, busca na internet
            })
    );
});
