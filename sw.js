'use strict';
const CACHE='class-stars-20261024-update';
const ASSETS=['./','./index.html','./app.js?v=20261024-update','./style.css?v=20261024-update','./core.js?v=20261024-update','./manifest.webmanifest','./icon-192.png','./icon-512.png','./icon-maskable.png','./xlsx.full.min.js'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('class-stars-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==self.location.origin||!url.href.startsWith(self.registration.scope))return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    try{const response=await fetch(request);if(response.ok)await cache.put(request,response.clone());return response}
    catch(error){const saved=await cache.match(request);if(saved)return saved;if(request.mode==='navigate'){const page=await cache.match('./index.html');if(page)return page}throw error}
  })());
});
