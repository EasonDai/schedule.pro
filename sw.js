// 课表 Pro - Service Worker
const CACHE_NAME = 'schedule-pro-v2';
const ASSETS = [
    './schedule.html',
    './manifest.json',
    './apple-touch-icon.png',
    './favicon.ico',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://html2canvas.hertzen.com/dist/html2canvas.min.js',
];

// 安装：预缓存核心资源
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(ASSETS).catch(err => {
                // 某些 CDN 资源可能加载失败，不阻塞安装
                console.warn('SW: 部分资源预缓存失败', err);
            });
        }).then(() => self.skipWaiting())
    );
});

// 激活：清理旧缓存
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            );
        }).then(() => self.clients.claim())
    );
});

// 请求拦截：网络优先 + 缓存兜底
self.addEventListener('fetch', event => {
    // 跳过非 GET 请求和 chrome-extension
    if (event.request.method !== 'GET') return;
    if (event.request.url.startsWith('chrome-extension://')) return;

    event.respondWith(
        fetch(event.request).then(response => {
            // 成功响应：更新缓存
            if (response.status === 200) {
                const cloned = response.clone();
                caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, cloned);
                });
            }
            return response;
        }).catch(() => {
            // 网络失败：从缓存读取
            return caches.match(event.request).then(cached => {
                return cached || new Response('离线模式 — 请连接网络后重试', {
                    status: 503,
                    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
                });
            });
        })
    );
});
