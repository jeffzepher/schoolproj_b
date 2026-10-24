'use strict';
const CACHE='class-stars-v11';
const ASSETS=['./','./index.html','./app.js?v=v11','./style.css?v=v11','./core.js?v=v11','./manifest.webmanifest?v=v11','./icon-192.png?v=v11','./icon-512.png?v=v11','./icon-maskable.png?v=v11','./apple-touch-icon.png?v=v11','./favicon.png?v=v11','./xlsx.full.min.js'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
async function refreshLegacyClient(client){
  if(!client.url.startsWith(self.registration.scope))return;
  const aware=await new Promise(resolve=>{
    const channel=new MessageChannel();
    const finish=value=>{clearTimeout(timer);channel.port1.close();resolve(value)};
    const timer=setTimeout(()=>finish(false),1800);
    channel.port1.onmessage=event=>{if(event.data?.type==='CLASS_STARS_UPDATE_ACK')finish(true)};
    try{client.postMessage({type:'CLASS_STARS_UPDATE_READY'},[channel.port2])}catch(error){finish(false)}
  });
  // Old installed pages have no update controls or message handler. Reload them once.
  if(!aware){const url=new URL(client.url);url.searchParams.set('__update',CACHE);await client.navigate(url.href)}
}
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(key=>key.startsWith('class-stars-')&&key!==CACHE).map(key=>caches.delete(key)));
  await self.clients.claim();
  const clients=await self.clients.matchAll({type:'window'});
  await Promise.allSettled(clients.map(refreshLegacyClient));
})()));
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==self.location.origin||!url.href.startsWith(self.registration.scope))return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    try{const response=await fetch(request);if(response.ok)await cache.put(request,response.clone());return response}
    catch(error){const saved=await cache.match(request);if(saved)return saved;if(request.mode==='navigate'){const page=await cache.match('./index.html');if(page)return page}throw error}
  })());
});
