const CACHE_NAME = 'karaoke-vip-v30';
const urlsToCache = [
    './',
    './index.html',
    './css/style.css',
    './js/app.js',
    './js/data.js',
    './image/icon.png'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('fetch', event => {
    // A MÁGICA: Se for um vídeo (mp4) ou uma requisição de partes (range), o SW ignora e não quebra o vídeo!
    if (event.request.url.endsWith('.mp4') || event.request.headers.get('range')) {
        return; 
    }

    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response; 
                }
                return fetch(event.request); 
            })
    );
});
