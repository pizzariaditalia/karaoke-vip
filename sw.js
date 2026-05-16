
const CACHE_NAME = 'karaoke-vip-v80'; 

const urlsToCache = [
    './',
    './index.html',
    './css/style.css',
    './js/data.js',
    './js/app.js',
    './js/upload.js'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
    );
});

// Essa parte limpa o lixo da versão antiga do celular da pessoa
self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName); 
                    }
                })
            );
        })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response; // Puxa do cache se tiver
                }
                return fetch(event.request); // Busca na internet se não tiver
            })
    );
});

// Mágica para o botão "Atualizar Agora" funcionar
self.addEventListener('message', event => {
    if (event.data === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
